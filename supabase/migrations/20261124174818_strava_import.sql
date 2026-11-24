-- Strava import.
--
-- 1. workouts.source ('manual' or 'strava') and workouts.strava_activity_id,
--    so an imported activity is recognisable and can only ever be paid once,
--    to one account.
-- 2. strava_connections: each player's Strava athlete id and OAuth tokens.
--    Nobody but the server (service role) can read or write it, so tokens
--    never reach a browser.
-- 3. private.record_workout(): the reward logic that used to live inside
--    log_workout(), moved unchanged so manual logging and Strava imports
--    share exactly the same rules (rates, caps, level curve, anti-spam).
--    log_workout() is now a thin wrapper and behaves exactly as before.
-- 4. import_strava_activity(): server-only. Called by the Strava webhook and
--    "Sync now" after the server has fetched the activity from Strava itself.
-- 5. get_strava_connection(): lets a player see whether they're connected,
--    without exposing tokens.

-- ---------------------------------------------------------------------------
-- 1. Workout source
-- ---------------------------------------------------------------------------

alter table public.workouts
  add column source text not null default 'manual' check (source in ('manual', 'strava')),
  add column strava_activity_id bigint,
  add constraint workouts_strava_source_check
    check ((source = 'strava') = (strava_activity_id is not null));

-- Global, not per player: if a Strava athlete is later linked to a second
-- Levelift account, its old activities can't be claimed again.
create unique index workouts_strava_activity_idx
  on public.workouts (strava_activity_id) where strava_activity_id is not null;

-- ---------------------------------------------------------------------------
-- 2. Strava connections (server-only)
-- ---------------------------------------------------------------------------

create table public.strava_connections (
  user_id         uuid primary key references public.profiles (id) on delete cascade,
  -- One Strava athlete can be linked to at most one Levelift account.
  athlete_id      bigint not null unique,
  athlete_name    text not null default '',
  access_token    text not null,
  refresh_token   text not null,
  expires_at      timestamptz not null,
  scope           text not null,
  connected_at    timestamptz not null default now(),
  last_synced_at  timestamptz
);

revoke all on public.strava_connections from anon, authenticated;
alter table public.strava_connections enable row level security;
-- No policies on purpose: only the service role (which bypasses RLS) uses it.

-- ---------------------------------------------------------------------------
-- 3. Shared reward logic
-- ---------------------------------------------------------------------------

create schema private;
revoke all on schema private from public, anon, authenticated;

create function private.record_workout(
  p_user               uuid,
  p_type               text,
  p_started_at         timestamptz,
  p_duration_minutes   integer,
  p_client_request_id  uuid,
  p_distance_km        numeric,
  p_sets               integer,
  p_source             text,
  p_strava_activity_id bigint
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  -- Reward rules (keep in sync with src/lib/rewards/config.ts)
  c_max_rewarded_minutes  constant integer := 120;
  c_daily_gold            constant integer := 400;
  c_daily_materials       constant integer := 200;
  c_daily_xp              constant integer := 600;
  -- Level curve (keep in sync with src/lib/rewards/levels.ts)
  c_max_level             constant integer := 50;
  -- Anti-spam: max workouts logged per player per UTC day (rewarded or not).
  c_max_workouts_per_day  constant integer := 20;

  v_user        uuid := p_user;
  v_existing    public.workouts;
  v_gold_rate   integer;
  v_mat_rate    integer;
  v_xp_rate     integer;
  v_minutes     integer;
  v_raw_gold    integer;
  v_raw_mat     integer;
  v_raw_xp      integer;
  v_today_gold  integer;
  v_today_mat   integer;
  v_today_xp    integer;
  v_gold        integer;
  v_mat         integer;
  v_xp          integer;
  v_capped      boolean;
  v_workout_id  uuid;
  v_level       integer;
  v_xp_total    integer;
  v_start_level integer;
  v_need        integer;
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED' using detail = 'You need to sign in.';
  end if;

  -- ---- Validate input ----------------------------------------------------
  if p_client_request_id is null then
    raise exception 'INVALID_INPUT' using detail = 'Missing request id.';
  end if;

  case p_type
    when 'running'  then v_gold_rate := 2; v_mat_rate := 1; v_xp_rate := 3;
    when 'walking'  then v_gold_rate := 1; v_mat_rate := 1; v_xp_rate := 2;
    when 'cycling'  then v_gold_rate := 2; v_mat_rate := 1; v_xp_rate := 2;
    when 'strength' then v_gold_rate := 2; v_mat_rate := 2; v_xp_rate := 3;
    else raise exception 'INVALID_INPUT' using detail = 'Unknown workout type.';
  end case;

  if p_duration_minutes is null or p_duration_minutes not between 1 and 600 then
    raise exception 'INVALID_INPUT' using detail = 'Duration must be between 1 and 600 minutes.';
  end if;

  if p_started_at is null
     or p_started_at > now() + interval '10 minutes'
     or p_started_at < now() - interval '7 days' then
    raise exception 'INVALID_INPUT' using detail = 'Workouts can only be logged for the last 7 days.';
  end if;

  if p_distance_km is not null and (p_type = 'strength' or p_distance_km not between 0 and 300) then
    raise exception 'INVALID_INPUT' using detail = 'Distance must be 0-300 km, and only for running, walking or cycling.';
  end if;

  if p_sets is not null and (p_type <> 'strength' or p_sets not between 1 and 100) then
    raise exception 'INVALID_INPUT' using detail = 'Sets must be 1-100, and only for strength training.';
  end if;

  -- ---- One reward operation per player at a time ------------------------
  -- Locking the wallet row serialises concurrent requests from the same
  -- player, which makes the duplicate check and the daily caps race-free.
  perform 1 from public.wallets where user_id = v_user for update;
  if not found then
    raise exception 'NOT_FOUND' using detail = 'Player not found.';
  end if;

  -- ---- Same request again? Return the original result, award nothing ----
  select * into v_existing
  from public.workouts
  where user_id = v_user and client_request_id = p_client_request_id;

  if found then
    return jsonb_build_object(
      'workout_id', v_existing.id,
      'gold', v_existing.gold_awarded,
      'materials', v_existing.materials_awarded,
      'xp', v_existing.xp_awarded,
      'daily_limit_reached', v_existing.reward_capped,
      'leveled_up', false,
      'duplicate', true
    );
  end if;

  -- ---- Anti-spam ---------------------------------------------------------
  if (
    select count(*) from public.workouts
    where user_id = v_user
      and created_at >= (date_trunc('day', now() at time zone 'utc') at time zone 'utc')
  ) >= c_max_workouts_per_day then
    raise exception 'RATE_LIMITED'
      using detail = 'You''ve logged a lot of workouts today. Try again tomorrow.';
  end if;

  -- ---- Calculate rewards -------------------------------------------------
  v_minutes  := least(p_duration_minutes, c_max_rewarded_minutes);
  v_raw_gold := v_minutes * v_gold_rate;
  v_raw_mat  := v_minutes * v_mat_rate;
  v_raw_xp   := v_minutes * v_xp_rate;

  -- Daily caps use the UTC day the workout is LOGGED (not when it happened),
  -- so back-dating workouts cannot multiply the caps.
  select coalesce(sum(gold_awarded), 0),
         coalesce(sum(materials_awarded), 0),
         coalesce(sum(xp_awarded), 0)
    into v_today_gold, v_today_mat, v_today_xp
  from public.workouts
  where user_id = v_user
    and created_at >= (date_trunc('day', now() at time zone 'utc') at time zone 'utc');

  v_gold := least(v_raw_gold, greatest(0, c_daily_gold - v_today_gold));
  v_mat  := least(v_raw_mat,  greatest(0, c_daily_materials - v_today_mat));
  v_xp   := least(v_raw_xp,   greatest(0, c_daily_xp - v_today_xp));
  v_capped := v_gold < v_raw_gold or v_mat < v_raw_mat or v_xp < v_raw_xp;

  -- ---- Save the workout --------------------------------------------------
  insert into public.workouts (
    user_id, type, started_at, duration_minutes, distance_km, sets,
    gold_awarded, materials_awarded, xp_awarded, reward_capped, client_request_id,
    source, strava_activity_id
  ) values (
    v_user, p_type, p_started_at, p_duration_minutes, p_distance_km, p_sets,
    v_gold, v_mat, v_xp, v_capped, p_client_request_id,
    p_source, p_strava_activity_id
  )
  returning id into v_workout_id;

  -- ---- Pay out -----------------------------------------------------------
  update public.wallets
  set gold = gold + v_gold, materials = materials + v_mat
  where user_id = v_user;

  -- XP and levels: profiles.xp is progress towards the next level.
  select level, xp into v_level, v_xp_total
  from public.profiles where id = v_user
  for update;

  v_start_level := v_level;
  v_xp_total := v_xp_total + v_xp;

  loop
    exit when v_level >= c_max_level;
    v_need := 100 * v_level;
    exit when v_xp_total < v_need;
    v_xp_total := v_xp_total - v_need;
    v_level := v_level + 1;
  end loop;

  update public.profiles
  set level = v_level, xp = v_xp_total
  where id = v_user;

  insert into public.resource_transactions (
    user_id, gold_delta, materials_delta, xp_delta, reason, workout_id
  ) values (
    v_user, v_gold, v_mat, v_xp, 'workout', v_workout_id
  );

  return jsonb_build_object(
    'workout_id', v_workout_id,
    'gold', v_gold,
    'materials', v_mat,
    'xp', v_xp,
    'daily_limit_reached', v_capped,
    'leveled_up', v_level > v_start_level,
    'duplicate', false
  );
end;
$$;

revoke execute on function private.record_workout(uuid, text, timestamptz, integer, uuid, numeric, integer, text, bigint)
  from public, anon, authenticated;

-- log_workout: same signature, grants and behaviour as before.
create or replace function public.log_workout(
  p_type               text,
  p_started_at         timestamptz,
  p_duration_minutes   integer,
  p_client_request_id  uuid,
  p_distance_km        numeric default null,
  p_sets               integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED' using detail = 'You need to sign in.';
  end if;

  return private.record_workout(
    auth.uid(), p_type, p_started_at, p_duration_minutes, p_client_request_id,
    p_distance_km, p_sets, 'manual', null
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. import_strava_activity (server only)
--
-- The server fetches the activity from Strava with the player's own token
-- and maps it to a workout type (src/lib/strava/activity.ts). Returns
-- { status: 'imported' | 'duplicate' | 'overlap' | 'claimed', ...rewards }.
--   duplicate: this activity was already imported for this player
--   claimed:   it was imported by a different Levelift account
--   overlap:   it overlaps a workout the player already has (e.g. they also
--              logged it by hand, or recorded it on two devices)
-- Validation errors (too old, too long, too many today) are raised like
-- log_workout's: INVALID_INPUT, RATE_LIMITED.
-- ---------------------------------------------------------------------------

create function public.import_strava_activity(
  p_user_id            uuid,
  p_strava_activity_id bigint,
  p_type               text,
  p_started_at         timestamptz,
  p_duration_minutes   integer,
  p_distance_km        numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner  uuid;
  v_result jsonb;
begin
  if p_user_id is null or p_strava_activity_id is null then
    raise exception 'INVALID_INPUT' using detail = 'Missing player or activity.';
  end if;

  if not exists (select 1 from public.strava_connections where user_id = p_user_id) then
    raise exception 'NOT_FOUND' using detail = 'Strava is not connected.';
  end if;

  -- Same lock as record_workout(), so the checks below are race-free.
  perform 1 from public.wallets where user_id = p_user_id for update;

  select user_id into v_owner
  from public.workouts where strava_activity_id = p_strava_activity_id;

  if found then
    return jsonb_build_object('status', case when v_owner = p_user_id then 'duplicate' else 'claimed' end);
  end if;

  if p_duration_minutes is not null and exists (
    select 1 from public.workouts w
    where w.user_id = p_user_id
      and w.started_at < p_started_at + make_interval(mins => p_duration_minutes)
      and w.started_at + make_interval(mins => w.duration_minutes) > p_started_at
  ) then
    return jsonb_build_object('status', 'overlap');
  end if;

  v_result := private.record_workout(
    p_user_id, p_type, p_started_at, p_duration_minutes, gen_random_uuid(),
    p_distance_km, null, 'strava', p_strava_activity_id
  );
  return v_result || jsonb_build_object('status', 'imported');
end;
$$;

revoke execute on function public.import_strava_activity(uuid, bigint, text, timestamptz, integer, numeric)
  from public, anon, authenticated;
grant execute on function public.import_strava_activity(uuid, bigint, text, timestamptz, integer, numeric)
  to service_role;

-- ---------------------------------------------------------------------------
-- 5. get_strava_connection: the signed-in player's link, without tokens.
-- Returns no row when not connected.
-- ---------------------------------------------------------------------------

create function public.get_strava_connection()
returns table (
  athlete_id     bigint,
  athlete_name   text,
  connected_at   timestamptz,
  last_synced_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.athlete_id, c.athlete_name, c.connected_at, c.last_synced_at
  from public.strava_connections c
  where c.user_id = auth.uid();
$$;

revoke execute on function public.get_strava_connection() from public, anon;
grant execute on function public.get_strava_connection() to authenticated;
