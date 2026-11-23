import { describe, expect, it } from "vitest";
import { calculateRewards } from "@/lib/rewards/calculate";
import { DAILY_LIMITS, MAX_REWARDED_MINUTES_PER_WORKOUT } from "@/lib/rewards/config";

describe("calculateRewards", () => {
  it("returns integer rewards for a normal workout", () => {
    const { rewards, dailyLimitReached } = calculateRewards("running", 30);
    expect(Number.isInteger(rewards.gold)).toBe(true);
    expect(rewards.gold).toBeGreaterThan(0);
    expect(dailyLimitReached).toBe(false);
  });

  it("caps rewarded minutes per workout", () => {
    const capped = calculateRewards("running", MAX_REWARDED_MINUTES_PER_WORKOUT);
    const huge = calculateRewards("running", 10_000);
    expect(huge.rewards).toEqual(capped.rewards);
  });

  it("never exceeds the daily limits", () => {
    const { rewards, dailyLimitReached } = calculateRewards("running", 60, {
      gold: DAILY_LIMITS.gold - 10,
      materials: 0,
      xp: 0,
    });
    expect(rewards.gold).toBe(10);
    expect(dailyLimitReached).toBe(true);
  });

  it("gives nothing for zero or negative durations", () => {
    expect(calculateRewards("walking", -5).rewards).toEqual({ gold: 0, materials: 0, xp: 0 });
  });
});
