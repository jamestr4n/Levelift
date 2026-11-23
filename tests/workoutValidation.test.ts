import { describe, expect, it } from "vitest";
import { validateWorkoutInput } from "@/lib/workouts/validate";
import type { WorkoutInput } from "@/types/game";

const now = new Date("2026-11-23T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();

const run: WorkoutInput = {
  type: "running",
  startedAt: hoursAgo(1),
  durationMinutes: 30,
  distanceKm: 5,
  clientRequestId: "6f1c2a8e-1b2c-4d3e-9f00-123456789abc",
};

describe("validateWorkoutInput", () => {
  it("accepts a normal run", () => {
    expect(validateWorkoutInput(run, now)).toBeNull();
  });

  it("accepts strength training with sets", () => {
    const { distanceKm: _unused, ...rest } = run;
    void _unused;
    expect(validateWorkoutInput({ ...rest, type: "strength", sets: 5 }, now)).toBeNull();
  });

  it.each<[string, Partial<WorkoutInput>]>([
    ["unknown type", { type: "swimming" as WorkoutInput["type"] }],
    ["zero minutes", { durationMinutes: 0 }],
    ["too many minutes", { durationMinutes: 601 }],
    ["fractional minutes", { durationMinutes: 10.5 }],
    ["start in the future", { startedAt: hoursAgo(-1) }],
    ["start over 7 days ago", { startedAt: hoursAgo(24 * 8) }],
    ["invalid date", { startedAt: "yesterday" }],
    ["negative distance", { distanceKm: -1 }],
    ["huge distance", { distanceKm: 301 }],
    ["sets on a run", { sets: 3 }],
    ["missing request id", { clientRequestId: "" }],
  ])("rejects %s", (_, change) => {
    expect(validateWorkoutInput({ ...run, ...change }, now)).toEqual(expect.any(String));
  });

  it("rejects distance on strength training", () => {
    expect(validateWorkoutInput({ ...run, type: "strength" }, now)).toEqual(expect.any(String));
  });
});
