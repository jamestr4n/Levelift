-- Week 4: friends, read-only kingdom visits and the weekly leaderboard.
--
-- Friendship is request + accept, so nobody can see your kingdom without
-- your agreement. Friends can SEE each other's kingdom, buildings and
-- character, never change them. Wallets, workout details and transactions
-- stay private; the leaderboard only shows weekly totals.
--
-- Errors are raised with the message set to a GameErrorCode and a
-- player-friendly DETAIL (see src/lib/supabase/errors.ts).

-- ---------------------------------------------------------------------------
-- Friendship check used by the RLS policies below
-- ---------------------------------------------------------------------------

create function public.is_friend(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and (
        (requester_id = (select auth.uid()) and addressee_id = p_other)
        or (addressee_id = (select auth.uid()) and requester_id = p_other)
      )
  );
$$;

revoke execute on function public.is_friend(uuid) from public, anon;
grant execute on function public.is_friend(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Friends can view (never edit) each other's kingdom and character
-- ---------------------------------------------------------------------------

create policy "Friends can view each other's kingdoms"
  on public.kingdoms for select to authenticated
  using (public.is_friend(user_id));

create policy "Friends can view each other's buildings"
  on public.owned_buildings for select to authenticated
  using (public.is_friend(user_id));

create policy "Friends can view each other's characters"
  on public.characters for select to authenticated
  using (public.is_friend(user_id));

-- ---------------------------------------------------------------------------
-- send_friend_request(username)
--   * already friends                -> {status: 'accepted'}  (no change)
--   * I already asked them           -> {status: 'pending'}   (no change)
--   * they already asked me          -> accepts it, {status: 'accepted'}
--   * otherwise                      -> new request, {status: 'pending'}
-- ---------------------------------------------------------------------------

create function public.send_friend_request(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_max_outgoing_pending constant integer := 50;

  v_user      uuid := auth.uid();
  v_target    uuid;
  v_existing  public.friendships;
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED' using detail = 'You need to sign in.';
  end if;

  select id into v_target
  from public.profiles
  where username = lower(trim(coalesce(p_username, '')));

  if v_target is null then
    raise exception 'NOT_FOUND' using detail = 'No player has that username.';
  end if;

  if v_target = v_user then
    raise exception 'INVALID_INPUT' using detail = 'You can''t add yourself as a friend.';
  end if;

  -- Serialise requests between this pair so two simultaneous requests
  -- (in either direction) can't create two rows.
  perform pg_advisory_xact_lock(
    hashtextextended(least(v_user, v_target)::text || greatest(v_user, v_target)::text, 0)
  );

  select * into v_existing
  from public.friendships
  where (requester_id = v_user and addressee_id = v_target)
     or (requester_id = v_target and addressee_id = v_user);

  if found then
    if v_existing.status = 'accepted' or v_existing.requester_id = v_user then
      return jsonb_build_object('status', v_existing.status, 'friendship_id', v_existing.id);
    end if;

    -- They had already asked me: asking back accepts it.
    update public.friendships set status = 'accepted' where id = v_existing.id;
    return jsonb_build_object('status', 'accepted', 'friendship_id', v_existing.id);
  end if;

  if (
    select count(*) from public.friendships
    where requester_id = v_user and status = 'pending'
  ) >= c_max_outgoing_pending then
    raise exception 'RATE_LIMITED' using detail = 'You have too many pending friend requests.';
  end if;

  insert into public.friendships (requester_id, addressee_id, status)
  values (v_user, v_target, 'pending')
  returning * into v_existing;

  return jsonb_build_object('status', 'pending', 'friendship_id', v_existing.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- respond_to_friend_request(id, accept): only the person who was asked.
-- Declining deletes the request (the other player is not told).
-- ---------------------------------------------------------------------------

create function public.respond_to_friend_request(p_friendship_id uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user  uuid := auth.uid();
  v_row   public.friendships;
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED' using detail = 'You need to sign in.';
  end if;

  select * into v_row
  from public.friendships
  where id = p_friendship_id and addressee_id = v_user and status = 'pending'
  for update;

  if not found then
    raise exception 'NOT_FOUND' using detail = 'That friend request no longer exists.';
  end if;

  if coalesce(p_accept, false) then
    update public.friendships set status = 'accepted' where id = v_row.id;
    return jsonb_build_object('status', 'accepted');
  end if;

  delete from public.friendships where id = v_row.id;
  return jsonb_build_object('status', 'declined');
end;
$$;

-- ---------------------------------------------------------------------------
-- remove_friend(user_id): ends a friendship, or cancels/declines a pending
-- request, in either direction. Doing it twice is harmless.
-- ---------------------------------------------------------------------------

create function public.remove_friend(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED' using detail = 'You need to sign in.';
  end if;

  delete from public.friendships
  where (requester_id = v_user and addressee_id = p_user_id)
     or (requester_id = p_user_id and addressee_id = v_user);

  return jsonb_build_object('removed', found);
end;
$$;

-- ---------------------------------------------------------------------------
-- get_friends(): accepted friends with their level and Kingdom Score
-- ---------------------------------------------------------------------------

create function public.get_friends()
returns table (
  id             uuid,
  username       text,
  display_name   text,
  level          integer,
  kingdom_score  integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.level, k.kingdom_score
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = (select auth.uid()) then f.addressee_id else f.requester_id end
  join public.kingdoms k on k.user_id = p.id
  where f.status = 'accepted'
    and (select auth.uid()) in (f.requester_id, f.addressee_id)
  order by p.display_name;
$$;

-- ---------------------------------------------------------------------------
-- get_friend_requests(): pending requests to and from me
-- ---------------------------------------------------------------------------

create function public.get_friend_requests()
returns table (
  id            uuid,
  direction     text,
  user_id       uuid,
  username      text,
  display_name  text,
  level         integer,
  created_at    timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    f.id,
    case when f.addressee_id = (select auth.uid()) then 'incoming' else 'outgoing' end,
    p.id, p.username, p.display_name, p.level, f.created_at
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = (select auth.uid()) then f.addressee_id else f.requester_id end
  where f.status = 'pending'
    and (select auth.uid()) in (f.requester_id, f.addressee_id)
  order by f.created_at desc;
$$;

-- ---------------------------------------------------------------------------
-- get_weekly_leaderboard(): me + my friends, ranked by Kingdom Score gained
-- this week (then weekly XP). The week starts Monday 00:00 UTC.
-- Weekly score comes from kingdom_score_events; weekly XP from workout
-- transactions. Only totals are shown, never individual workouts.
-- ---------------------------------------------------------------------------

create function public.get_weekly_leaderboard()
returns table (
  rank                  integer,
  user_id               uuid,
  display_name          text,
  weekly_kingdom_score  integer,
  weekly_xp             integer,
  is_current_user       boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with
    me as (select auth.uid() as id),
    week as (select date_trunc('week', now() at time zone 'utc') at time zone 'utc' as start),
    people as (
      select id from me where id is not null
      union
      select case when f.requester_id = me.id then f.addressee_id else f.requester_id end
      from public.friendships f, me
      where f.status = 'accepted' and me.id in (f.requester_id, f.addressee_id)
    ),
    totals as (
      select
        p.id as user_id,
        pr.display_name,
        coalesce((
          select sum(e.delta) from public.kingdom_score_events e, week
          where e.user_id = p.id and e.created_at >= week.start
        ), 0)::integer as weekly_kingdom_score,
        coalesce((
          select sum(t.xp_delta) from public.resource_transactions t, week
          where t.user_id = p.id and t.reason = 'workout' and t.created_at >= week.start
        ), 0)::integer as weekly_xp
      from people p
      join public.profiles pr on pr.id = p.id
    )
  select
    (row_number() over (
      order by weekly_kingdom_score desc, weekly_xp desc, display_name, user_id
    ))::integer,
    user_id,
    display_name,
    weekly_kingdom_score,
    weekly_xp,
    user_id = (select id from me)
  from totals
  order by 1;
$$;

-- ---------------------------------------------------------------------------
-- Permissions: signed-in players only
-- ---------------------------------------------------------------------------

revoke execute on function
  public.send_friend_request(text),
  public.respond_to_friend_request(uuid, boolean),
  public.remove_friend(uuid),
  public.get_friends(),
  public.get_friend_requests(),
  public.get_weekly_leaderboard()
from public, anon;

grant execute on function
  public.send_friend_request(text),
  public.respond_to_friend_request(uuid, boolean),
  public.remove_friend(uuid),
  public.get_friends(),
  public.get_friend_requests(),
  public.get_weekly_leaderboard()
to authenticated;
