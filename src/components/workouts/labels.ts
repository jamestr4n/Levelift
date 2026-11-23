import type { Workout, WorkoutType } from "@/types/game";

export const WORKOUT_LABELS: Record<WorkoutType, string> = {
  running: "Run",
  walking: "Walk",
  cycling: "Ride",
  strength: "Strength",
};

export const DISTANCE_TYPES: readonly WorkoutType[] = ["running", "walking", "cycling"];

/** e.g. "30 min · 5 km" or "45 min · 12 sets". */
export function workoutDetail(w: Pick<Workout, "durationMinutes" | "distanceKm" | "sets">) {
  if (w.distanceKm) return `${w.durationMinutes} min · ${w.distanceKm} km`;
  if (w.sets) return `${w.durationMinutes} min · ${w.sets} sets`;
  return `${w.durationMinutes} min`;
}
