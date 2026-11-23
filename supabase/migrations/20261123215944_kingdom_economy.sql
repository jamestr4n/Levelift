-- Week 3: buying, placing and upgrading buildings.
--
-- purchase_building() and upgrade_building() are the ONLY ways Gold and
-- Materials are spent. Each runs as one transaction on the server:
-- check -> charge -> change the kingdom -> record it.

-- ---------------------------------------------------------------------------
-- Prices and scores: use the same placeholder numbers as the frontend mock
-- (src/services/mock/index.ts) so both behave the same.
-- TODO(team): still placeholders; agree on the real numbers.
-- ---------------------------------------------------------------------------

update public.building_definitions set
  costs = '[{"gold": 0, "materials": 0}, {"gold": 300, "materials": 60}, {"gold": 600, "materials": 120}]',
  score_by_level = array[15, 35, 60]
where type = 'town_hall';

update public.building_definitions set
  costs = '[{"gold": 100, "materials": 10}, {"gold": 150, "materials": 25}, {"gold": 250, "materials": 50}]',
  score_by_level = array[5, 10, 18]
where type = 'house';

update public.building_definitions set
  costs = '[{"gold": 120, "materials": 20}, {"gold": 180, "materials": 35}, {"gold": 280, "materials": 60}]',
  score_by_level = array[6, 12, 20]
where type = 'farm';

update public.building_definitions set
  costs = '[{"gold": 180, "materials": 40}, {"gold": 260, "materials": 60}, {"gold": 400, "materials": 90}]',
  score_by_level = array[8, 16, 28]
where type = 'workshop';

-- Recalculate every existing kingdom's score with the new numbers.
update public.kingdoms k set kingdom_score = coalesce((
  select sum(d.score_by_level[b.level])
  from public.owned_buildings b
  join public.building_definitions d on d.type = b.type
  where b.user_id = k.user_id
), 0);

-- ---------------------------------------------------------------------------
-- Kingdom score history (feeds the weekly leaderboard in week 4)
--
-- One row per score change from a purchase or upgrade. The starting Town Hall
-- is not recorded, so a new player doesn't top the leaderboard for signing up.
-- ---------------------------------------------------------------------------

create table public.kingdom_score_events (
  id                 bigint generated always as identity primary key,
  user_id            uuid not null references public.profiles (id) on delete cascade,
  delta              integer not null,
  reason             text not null check (reason in ('purchase', 'upgrade')),
  owned_building_id  uuid references public.owned_buildings (id) on delete set null,
  created_at         timestamptz not null default now()
);
create index kingdom_score_events_user_created_idx
  on public.kingdom_score_events (user_id, created_at);

revoke all on public.kingdom_score_events from anon, authenticated;
grant select on public.kingdom_score_events to authenticated;
alter table public.kingdom_score_events enable row level security;

create policy "Players can view their own score events"
  on public.kingdom_score_events for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- purchase_building
--
-- Errors are raised with the message set to a GameErrorCode and a
-- player-friendly DETAIL (see src/lib/supabase/errors.ts).
-- ---------------------------------------------------------------------------

create function public.purchase_building(p_type text, p_x integer, p_y integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user       uuid := auth.uid();
  v_def        public.building_definitions;
  v_kingdom    public.kingdoms;
  v_wallet     public.wallets;
  v_cost_gold  integer;
  v_cost_mat   integer;
  v_score      integer;
  v_building   public.owned_buildings;
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED' using detail = 'You need to sign in.';
  end if;

  -- Lock the wallet first: one spend per player at a time, so two purchases
  -- can never both spend the same Gold or take the same plot.
  select * into v_wallet from public.wallets where user_id = v_user for update;
  if not found then
    raise exception 'NOT_FOUND' using detail = 'Player not found.';
  end if;

  select * into v_def from public.building_definitions where type = p_type;
  if not found then
    raise exception 'INVALID_INPUT' using detail = 'Unknown building type.';
  end if;

  if p_type = 'town_hall' then
    raise exception 'INVALID_INPUT' using detail = 'Your kingdom already has a Town Hall.';
  end if;

  select * into v_kingdom from public.kingdoms where user_id = v_user;

  if p_x is null or p_y is null
     or p_x < 0 or p_y < 0
     or p_x >= v_kingdom.grid_width or p_y >= v_kingdom.grid_height then
    raise exception 'INVALID_INPUT' using detail = 'That plot is outside your kingdom.';
  end if;

  if exists (
    select 1 from public.owned_buildings
    where user_id = v_user and x = p_x and y = p_y
  ) then
    raise exception 'PLOT_OCCUPIED' using detail = 'That plot already has a building.';
  end if;

  v_cost_gold := (v_def.costs -> 0 ->> 'gold')::integer;
  v_cost_mat  := (v_def.costs -> 0 ->> 'materials')::integer;

  if v_wallet.gold < v_cost_gold or v_wallet.materials < v_cost_mat then
    raise exception 'INSUFFICIENT_FUNDS' using detail = 'Not enough Gold or Materials.';
  end if;

  v_score := v_def.score_by_level[1];

  update public.wallets
  set gold = gold - v_cost_gold, materials = materials - v_cost_mat
  where user_id = v_user;

  insert into public.owned_buildings (user_id, type, level, x, y)
  values (v_user, p_type, 1, p_x, p_y)
  returning * into v_building;

  update public.kingdoms
  set kingdom_score = kingdom_score + v_score
  where user_id = v_user;

  insert into public.resource_transactions (user_id, gold_delta, materials_delta, reason, owned_building_id)
  values (v_user, -v_cost_gold, -v_cost_mat, 'purchase', v_building.id);

  insert into public.kingdom_score_events (user_id, delta, reason, owned_building_id)
  values (v_user, v_score, 'purchase', v_building.id);

  return jsonb_build_object('building_id', v_building.id);
end;
$$;

revoke execute on function public.purchase_building(text, integer, integer) from public, anon;
grant execute on function public.purchase_building(text, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- upgrade_building
-- ---------------------------------------------------------------------------

create function public.upgrade_building(p_building_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user       uuid := auth.uid();
  v_wallet     public.wallets;
  v_building   public.owned_buildings;
  v_def        public.building_definitions;
  v_cost_gold  integer;
  v_cost_mat   integer;
  v_delta      integer;
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED' using detail = 'You need to sign in.';
  end if;

  select * into v_wallet from public.wallets where user_id = v_user for update;
  if not found then
    raise exception 'NOT_FOUND' using detail = 'Player not found.';
  end if;

  -- Only the player's own buildings: someone else's building looks "not found".
  select * into v_building
  from public.owned_buildings
  where id = p_building_id and user_id = v_user
  for update;
  if not found then
    raise exception 'NOT_FOUND' using detail = 'Building not found.';
  end if;

  select * into v_def from public.building_definitions where type = v_building.type;

  if v_building.level >= v_def.max_level then
    raise exception 'MAX_LEVEL' using detail = 'This building is already at max level.';
  end if;

  -- costs[n] (0-based) is the price to go from level n to level n + 1.
  v_cost_gold := (v_def.costs -> v_building.level ->> 'gold')::integer;
  v_cost_mat  := (v_def.costs -> v_building.level ->> 'materials')::integer;

  if v_wallet.gold < v_cost_gold or v_wallet.materials < v_cost_mat then
    raise exception 'INSUFFICIENT_FUNDS' using detail = 'Not enough Gold or Materials.';
  end if;

  -- score_by_level is 1-based.
  v_delta := v_def.score_by_level[v_building.level + 1] - v_def.score_by_level[v_building.level];

  update public.wallets
  set gold = gold - v_cost_gold, materials = materials - v_cost_mat
  where user_id = v_user;

  update public.owned_buildings
  set level = level + 1
  where id = v_building.id;

  update public.kingdoms
  set kingdom_score = kingdom_score + v_delta
  where user_id = v_user;

  insert into public.resource_transactions (user_id, gold_delta, materials_delta, reason, owned_building_id)
  values (v_user, -v_cost_gold, -v_cost_mat, 'upgrade', v_building.id);

  insert into public.kingdom_score_events (user_id, delta, reason, owned_building_id)
  values (v_user, v_delta, 'upgrade', v_building.id);

  return jsonb_build_object('building_id', v_building.id);
end;
$$;

revoke execute on function public.upgrade_building(uuid) from public, anon;
grant execute on function public.upgrade_building(uuid) to authenticated;
