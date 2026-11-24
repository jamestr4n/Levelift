import { describe, expect, it } from "vitest";
import { mapStravaActivity, type StravaActivity } from "@/lib/strava/activity";
import { hasActivityScope } from "@/lib/strava/config";
import { isWebhookEvent } from "@/lib/strava/sync";

const NOW = new Date("2026-11-24T12:00:00Z");

function activity(overrides: Partial<StravaActivity> = {}): StravaActivity {
  return {
    id: 123456789,
    sport_type: "Run",
    start_date: "2026-11-24T07:30:00Z",
    moving_time: 30 * 60,
    elapsed_time: 35 * 60,
    distance: 5012.4,
    ...overrides,
  };
}

describe("mapStravaActivity", () => {
  it("maps a run using moving time and km rounded to 2 decimals", () => {
    expect(mapStravaActivity(activity(), NOW)).toEqual({
      ok: true,
      activity: {
        activityId: 123456789,
        type: "running",
        startedAt: "2026-11-24T07:30:00.000Z",
        durationMinutes: 30,
        distanceKm: 5.01,
      },
    });
  });

  it.each([
    ["TrailRun", "running"],
    ["VirtualRun", "running"],
    ["Walk", "walking"],
    ["Hike", "walking"],
    ["Ride", "cycling"],
    ["MountainBikeRide", "cycling"],
    ["GravelRide", "cycling"],
    ["VirtualRide", "cycling"],
    ["WeightTraining", "strength"],
    ["Crossfit", "strength"],
  ])("maps %s to %s", (sport, type) => {
    const mapped = mapStravaActivity(activity({ sport_type: sport }), NOW);
    expect(mapped.ok && mapped.activity.type).toBe(type);
  });

  it.each(["Swim", "Yoga", "EBikeRide", "EMountainBikeRide", "AlpineSki", "Workout"])(
    "skips unsupported sport %s",
    (sport) => {
      expect(mapStravaActivity(activity({ sport_type: sport }), NOW)).toEqual({
        ok: false,
        reason: "unsupported_sport",
      });
    },
  );

  it("never sends a distance for strength training", () => {
    const mapped = mapStravaActivity(activity({ sport_type: "WeightTraining", distance: 0 }), NOW);
    expect(mapped).toMatchObject({ ok: true, activity: { type: "strength" } });
    expect(mapped.ok && "distanceKm" in mapped.activity).toBe(false);
  });

  it("leaves out zero and over-300 km distances instead of failing", () => {
    const zero = mapStravaActivity(activity({ distance: 0 }), NOW);
    const huge = mapStravaActivity(activity({ sport_type: "Ride", distance: 320_000 }), NOW);
    expect(zero.ok && zero.activity.distanceKm).toBeUndefined();
    expect(huge.ok && huge.activity.distanceKm).toBeUndefined();
  });

  it("falls back to elapsed time when moving time is 0", () => {
    const mapped = mapStravaActivity(activity({ moving_time: 0, elapsed_time: 45 * 60 }), NOW);
    expect(mapped.ok && mapped.activity.durationMinutes).toBe(45);
  });

  it("skips activities shorter than a minute", () => {
    expect(mapStravaActivity(activity({ moving_time: 20, elapsed_time: 25 }), NOW)).toEqual({
      ok: false,
      reason: "too_short",
    });
  });

  it("caps duration at 600 minutes (rewards stop at 120 anyway)", () => {
    const mapped = mapStravaActivity(activity({ sport_type: "Hike", moving_time: 11 * 3600 }), NOW);
    expect(mapped.ok && mapped.activity.durationMinutes).toBe(600);
  });

  it("skips activities older than 7 days", () => {
    expect(mapStravaActivity(activity({ start_date: "2026-11-17T11:00:00Z" }), NOW)).toEqual({
      ok: false,
      reason: "too_old",
    });
  });

  it("rejects malformed activities", () => {
    expect(mapStravaActivity(activity({ start_date: "not a date" }), NOW)).toEqual({ ok: false, reason: "invalid" });
    expect(mapStravaActivity(activity({ id: -1 }), NOW)).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("hasActivityScope", () => {
  it("accepts read_all or read, comma or space separated", () => {
    expect(hasActivityScope("read,activity:read_all")).toBe(true);
    expect(hasActivityScope("read activity:read")).toBe(true);
  });
  it("rejects when the player unticked activity access", () => {
    expect(hasActivityScope("read")).toBe(false);
    expect(hasActivityScope(null)).toBe(false);
  });
});

describe("isWebhookEvent", () => {
  const event = {
    object_type: "activity",
    object_id: 1360128428,
    aspect_type: "create",
    owner_id: 134815,
    subscription_id: 120475,
    event_time: 1516126040,
  };

  it("accepts Strava's documented payload", () => {
    expect(isWebhookEvent(event)).toBe(true);
    expect(
      isWebhookEvent({ ...event, object_type: "athlete", aspect_type: "update", updates: { authorized: "false" } }),
    ).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isWebhookEvent(null)).toBe(false);
    expect(isWebhookEvent("hello")).toBe(false);
    expect(isWebhookEvent({ ...event, object_type: "club" })).toBe(false);
    expect(isWebhookEvent({ ...event, owner_id: "134815" })).toBe(false);
  });
});
