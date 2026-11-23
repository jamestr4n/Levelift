// BACKEND-OWNED. Real implementation backed by Supabase.
// Rewards are calculated server-side; never send reward amounts from the client.
import type { Workout, WorkoutInput, WorkoutRewardResult } from "@/types/game";
import { notImplemented } from "./notImplemented";

export async function logWorkout(input: WorkoutInput): Promise<WorkoutRewardResult> {
  void input;
  return notImplemented("logWorkout");
}

export async function getWorkoutHistory(): Promise<Workout[]> {
  return notImplemented("getWorkoutHistory");
}
