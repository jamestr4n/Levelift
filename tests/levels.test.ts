import { describe, expect, it } from "vitest";
import { applyXp, MAX_LEVEL, xpToNextLevel } from "@/lib/rewards/levels";

describe("xpToNextLevel", () => {
  it("grows with level", () => {
    expect(xpToNextLevel(2)).toBeGreaterThan(xpToNextLevel(1));
  });

  it("returns positive integers", () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const xp = xpToNextLevel(level);
      expect(Number.isInteger(xp)).toBe(true);
      expect(xp).toBeGreaterThan(0);
    }
  });

  it("clamps out-of-range levels", () => {
    expect(xpToNextLevel(0)).toBe(xpToNextLevel(1));
    expect(xpToNextLevel(MAX_LEVEL + 10)).toBe(xpToNextLevel(MAX_LEVEL));
  });
});

describe("applyXp", () => {
  it("adds XP without levelling up when below the requirement", () => {
    expect(applyXp(1, 0, 50)).toEqual({ level: 1, xp: 50, leveledUp: false });
  });

  it("levels up and carries the remainder", () => {
    // Level 1 needs 100, level 2 needs 200: 360 XP -> level 3 with 60 left.
    expect(applyXp(1, 0, 360)).toEqual({ level: 3, xp: 60, leveledUp: true });
  });

  it("levels up exactly at the requirement", () => {
    expect(applyXp(1, 40, 60)).toEqual({ level: 2, xp: 0, leveledUp: true });
  });

  it("stops at the max level", () => {
    const result = applyXp(MAX_LEVEL, 0, 1_000_000);
    expect(result.level).toBe(MAX_LEVEL);
    expect(result.leveledUp).toBe(false);
  });
});
