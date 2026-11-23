import type { GameErrorCode } from "@/types/game";

const messages: Partial<Record<GameErrorCode, string>> = {
  NOT_AUTHENTICATED: "Please sign in to continue.",
  NOT_FOUND: "We couldn't find that.",
  FORBIDDEN: "You don't have permission to do that.",
  INVALID_INPUT: "Please check the details and try again.",
  INSUFFICIENT_FUNDS: "Not enough Gold or Materials yet. Log a workout to earn more!",
  PLOT_OCCUPIED: "That plot already has a building.",
  MAX_LEVEL: "This building is already at its highest level.",
  DUPLICATE_REQUEST: "That was already saved.",
  RATE_LIMITED: "Too many attempts. Please wait a moment and try again.",
  NOT_IMPLEMENTED: "This feature isn't ready yet.",
};

const FALLBACK = "Something went wrong. Please try again.";

/**
 * Turns any thrown value into text that is safe to show players. Checks `code`
 * by shape, not `instanceof GameError`: errors thrown by server actions arrive
 * as plain objects, and in production lose their code entirely.
 */
export function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === "string" && code in messages) {
      return messages[code as GameErrorCode]!;
    }
  }
  return FALLBACK;
}
