import { describe, expect, it } from "vitest";
import { MAX_LEVEL, xpToNextLevel } from "@/lib/rewards/levels";

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
