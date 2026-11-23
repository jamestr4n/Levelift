"use server";
// BACKEND-OWNED. Real implementation backed by Supabase (server actions).
// Rewards are calculated by the log_workout() database function; the client
// never sends reward amounts.
import { toGameError } from "@/lib/supabase/errors";
import { validateWorkoutInput } from "@/lib/workouts/validate";
import { GameError, type Workout, type WorkoutInput, type WorkoutRewardResult } from "@/types/game";
import { toWorkout } from "./mappers";
import { loadPlayer, requireUser } from "./session";

/** Shape of the JSON returned by log_workout(). */
interface LogWorkoutRpcResult {
  workout_id: string;
  gold: number;
  materials: number;
  xp: number;
  daily_limit_reached: boolean;
  leveled_up: boolean;
  duplicate: boolean;
}

const HISTORY_LIMIT = 100;

export async function logWorkout(input: WorkoutInput): Promise<WorkoutRewardResult> {
  const invalid = validateWorkoutInput(input);
  if (invalid) throw new GameError("INVALID_INPUT", invalid);

  const { supabase, userId } = await requireUser();

  const { data, error } = await supabase.rpc("log_workout", {
    p_type: input.type,
    p_started_at: input.startedAt,
    p_duration_minutes: input.durationMinutes,
    p_client_request_id: input.clientRequestId,
    p_distance_km: input.distanceKm,
    p_sets: input.sets,
  });
  if (error) throw toGameError(error);

  const result = data as unknown as LogWorkoutRpcResult;

  const [workout, player] = await Promise.all([
    supabase.from("workouts").select("*").eq("id", result.workout_id).single(),
    loadPlayer(supabase, userId),
  ]);
  if (workout.error) throw new GameError("NOT_FOUND", "Workout not found.");

  return {
    workout: toWorkout(workout.data),
    rewards: { gold: result.gold, materials: result.materials, xp: result.xp },
    dailyLimitReached: result.daily_limit_reached,
    leveledUp: result.leveled_up,
    player,
  };
}

/** The signed-in player's most recent workouts, newest first. */
export async function getWorkoutHistory(): Promise<Workout[]> {
  const { supabase, userId } = await requireUser();

  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  if (error) throw toGameError(error);
  return data.map(toWorkout);
}
