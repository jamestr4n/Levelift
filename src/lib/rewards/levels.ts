// BACKEND-OWNED. Level curve.
// TODO(team): placeholder curve; agree on the real one with the frontend.
//
// profiles.xp is the XP earned towards the NEXT level (it resets on level-up).

export const MAX_LEVEL = 50;

/** XP needed to go from `level` to `level + 1`. */
export function xpToNextLevel(level: number): number {
  const l = Math.max(1, Math.min(Math.floor(level), MAX_LEVEL));
  return 100 * l;
}
