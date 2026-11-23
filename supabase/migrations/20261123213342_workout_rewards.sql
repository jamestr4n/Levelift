-- Week 2: logging workouts and awarding Gold, Materials and XP.
--
-- log_workout() is the ONLY way rewards are created. It runs as one
-- transaction on the server, so the browser never chooses reward amounts.
--
-- The numbers below MUST match the TypeScript mirror used for previews and
-- tests:
--   rates, per-workout minute cap, daily caps  ->  src/lib/rewards/config.ts
--   level curve (100 x level, max level 50)     ->  src/lib/rewards/levels.ts
-- tests/db/workouts.test.ts fails if they drift apart.

-- Remember whether a daily cap reduced this workout's rewards, so a retried
-- request can return exactly the same result.
alter table public.workouts
  add column reward_capped boolean not null default false;

-- ---------------------------------------------------------------------------
-- log_workout
--
-- Errors are raised with the message set to a GameErrorCode
-- (NOT_AUTHENTICATED, INVALID_INPUT) and a player-friendly DETAIL.
-- ---------------------------------------------------------------------------

create function public.log_workout(
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
declare
  -- Reward rules (keep in sync with src/lib/rewards/config.ts)
  c_max_rewarded_minutes  constant integer := 120;
  c_daily_gold            constant integer := 400;
  c_daily_materials       constant integer := 200;
  c_daily_xp              constant integer := 600;
  -- Level curve (keep in sync with src/lib/rewards/levels.ts)
  c_max_level             constant integer := 50;

  v_user        uuid := auth.uid();
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
  -- ---- Who is calling ----------------------------------------------------
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
    gold_awarded, materials_awarded, xp_awarded, reward_capped, client_request_id
  ) values (
    v_user, p_type, p_started_at, p_duration_minutes, p_distance_km, p_sets,
    v_gold, v_mat, v_xp, v_capped, p_client_request_id
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

revoke execute on function public.log_workout(text, timestamptz, integer, uuid, numeric, integer)
  from public, anon;
grant execute on function public.log_workout(text, timestamptz, integer, uuid, numeric, integer)
  to authenticated;
