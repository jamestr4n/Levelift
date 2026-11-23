// BACKEND-OWNED. Placeholder reward rules; tune these.
// TODO(team): agree on the real numbers.
// The database function log_workout() (latest definition in supabase/migrations/)
// is the source of truth and must use the same numbers; tests/db/workouts.test.ts
// fails if they drift apart.
import type { WorkoutType } from "@/types/game";

export const REWARD_RATES: Record<WorkoutType, { goldPerMin: number; materialsPerMin: number; xpPerMin: number }> = {
  running: { goldPerMin: 2, materialsPerMin: 1, xpPerMin: 3 },
  walking: { goldPerMin: 1, materialsPerMin: 1, xpPerMin: 2 },
  cycling: { goldPerMin: 2, materialsPerMin: 1, xpPerMin: 2 },
  strength: { goldPerMin: 2, materialsPerMin: 2, xpPerMin: 3 },
};

/** Minutes per workout that earn rewards (stops huge fake durations). */
export const MAX_REWARDED_MINUTES_PER_WORKOUT = 120;

/** Daily caps across all workouts. */
export const DAILY_LIMITS = { gold: 400, materials: 200, xp: 600 };
