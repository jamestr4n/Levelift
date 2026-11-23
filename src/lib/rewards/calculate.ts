// BACKEND-OWNED. Pure reward calculation (no database access) so it can be unit tested.
import type { Rewards, WorkoutType } from "@/types/game";
import { DAILY_LIMITS, MAX_REWARDED_MINUTES_PER_WORKOUT, REWARD_RATES } from "./config";

export function calculateRewards(
  type: WorkoutType,
  durationMinutes: number,
  alreadyEarnedToday: Rewards = { gold: 0, materials: 0, xp: 0 },
): { rewards: Rewards; dailyLimitReached: boolean } {
  const minutes = Math.max(0, Math.min(Math.floor(durationMinutes), MAX_REWARDED_MINUTES_PER_WORKOUT));
  const rate = REWARD_RATES[type];

  const raw: Rewards = {
    gold: minutes * rate.goldPerMin,
    materials: minutes * rate.materialsPerMin,
    xp: minutes * rate.xpPerMin,
  };

  const rewards: Rewards = {
    gold: Math.min(raw.gold, Math.max(0, DAILY_LIMITS.gold - alreadyEarnedToday.gold)),
    materials: Math.min(raw.materials, Math.max(0, DAILY_LIMITS.materials - alreadyEarnedToday.materials)),
    xp: Math.min(raw.xp, Math.max(0, DAILY_LIMITS.xp - alreadyEarnedToday.xp)),
  };

  const dailyLimitReached =
    rewards.gold < raw.gold || rewards.materials < raw.materials || rewards.xp < raw.xp;

  return { rewards, dailyLimitReached };
}
