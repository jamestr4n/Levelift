// BACKEND-OWNED. Workout input rules, shared by the server and (optionally) forms.
// The database function log_workout() enforces the same rules.
import type { WorkoutInput } from "@/types/game";

export const WORKOUT_TYPES = ["running", "walking", "cycling", "strength"] as const;
export const MAX_DURATION_MINUTES = 600;
export const MAX_DISTANCE_KM = 300;
export const MAX_SETS = 100;
export const MAX_DAYS_AGO = 7;
/** Allowed clock skew for start times slightly in the future. */
const FUTURE_TOLERANCE_MS = 10 * 60 * 1000;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns a player-friendly message if the input is invalid, otherwise null. */
export function validateWorkoutInput(input: WorkoutInput, now: Date = new Date()): string | null {
  if (!WORKOUT_TYPES.includes(input.type)) return "Unknown workout type.";

  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 1 || input.durationMinutes > MAX_DURATION_MINUTES) {
    return `Duration must be between 1 and ${MAX_DURATION_MINUTES} minutes.`;
  }

  const started = Date.parse(input.startedAt);
  if (Number.isNaN(started)) return "Please enter a valid start time.";
  if (started > now.getTime() + FUTURE_TOLERANCE_MS) return "Start time can't be in the future.";
  if (started < now.getTime() - MAX_DAYS_AGO * 24 * 60 * 60 * 1000) {
    return `Workouts can only be logged for the last ${MAX_DAYS_AGO} days.`;
  }

  if (input.distanceKm !== undefined) {
    if (input.type === "strength") return "Distance is only for running, walking or cycling.";
    if (!(input.distanceKm >= 0 && input.distanceKm <= MAX_DISTANCE_KM)) {
      return `Distance must be between 0 and ${MAX_DISTANCE_KM} km.`;
    }
  }

  if (input.sets !== undefined) {
    if (input.type !== "strength") return "Sets are only for strength training.";
    if (!Number.isInteger(input.sets) || input.sets < 1 || input.sets > MAX_SETS) {
      return `Sets must be between 1 and ${MAX_SETS}.`;
    }
  }

  if (!UUID_PATTERN.test(input.clientRequestId)) return "Missing request id.";
  return null;
}
