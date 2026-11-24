// BACKEND-OWNED. Pure rules for turning a Strava activity into a workout.
// No secrets or I/O here, so it's unit-tested (tests/stravaActivity.test.ts).
// The database still validates everything (log rules in private.record_workout).
import type { WorkoutType } from "@/types/game";

/** The fields we use from Strava's (Summary/Detailed)Activity. */
export interface StravaActivity {
  id: number;
  sport_type: string;
  /** ISO 8601, UTC. */
  start_date: string;
  /** Seconds. */
  moving_time: number;
  /** Seconds. */
  elapsed_time: number;
  /** Metres. */
  distance: number;
}

/**
 * Strava sport types we import. Anything else (swims, yoga, e-bikes, ski…)
 * is skipped until the game has a workout type for it. E-bike rides are
 * left out on purpose: the motor does part of the work.
 */
export const SPORT_TYPE_MAP: Readonly<Record<string, WorkoutType>> = {
  Run: "running",
  TrailRun: "running",
  VirtualRun: "running",
  Walk: "walking",
  Hike: "walking",
  Ride: "cycling",
  MountainBikeRide: "cycling",
  GravelRide: "cycling",
  VirtualRide: "cycling",
  WeightTraining: "strength",
  Crossfit: "strength",
};

/** Same limits as log_workout: 1-600 minutes, 0-300 km, the last 7 days. */
const MAX_MINUTES = 600;
const MAX_DISTANCE_KM = 300;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface ImportableActivity {
  activityId: number;
  type: WorkoutType;
  startedAt: string;
  durationMinutes: number;
  distanceKm?: number;
}

export type SkipReason = "unsupported_sport" | "too_short" | "too_old" | "invalid";

export type MappedActivity = { ok: true; activity: ImportableActivity } | { ok: false; reason: SkipReason };

export function mapStravaActivity(a: StravaActivity, now: Date = new Date()): MappedActivity {
  const type = SPORT_TYPE_MAP[a.sport_type];
  if (!type) return { ok: false, reason: "unsupported_sport" };

  const started = new Date(a.start_date);
  if (!Number.isSafeInteger(a.id) || a.id <= 0 || Number.isNaN(started.getTime())) {
    return { ok: false, reason: "invalid" };
  }
  if (now.getTime() - started.getTime() > MAX_AGE_MS) return { ok: false, reason: "too_old" };

  // Moving time leaves out pauses. Some manual entries only have elapsed time.
  const seconds = a.moving_time > 0 ? a.moving_time : a.elapsed_time;
  const minutes = Math.round(seconds / 60);
  if (!(minutes >= 1)) return { ok: false, reason: "too_short" };

  // Rewards stop at 120 minutes anyway; this only keeps the row valid.
  const durationMinutes = Math.min(minutes, MAX_MINUTES);

  let distanceKm: number | undefined;
  if (type !== "strength" && a.distance > 0) {
    const km = Math.round(a.distance / 10) / 100; // metres -> km, 2 decimals
    if (km <= MAX_DISTANCE_KM) distanceKm = km;
  }

  return {
    ok: true,
    activity: {
      activityId: a.id,
      type,
      startedAt: started.toISOString(),
      durationMinutes,
      ...(distanceKm !== undefined && { distanceKm }),
    },
  };
}
