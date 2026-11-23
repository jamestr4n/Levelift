// BACKEND-OWNED. Turns errors raised by our database functions into GameErrors.
//
// Our SQL functions raise:  raise exception '<GameErrorCode>' using detail = '<message>';
// PostgREST passes these through as { message: code, details: message }.
import { GameError, type GameErrorCode } from "@/types/game";

const KNOWN_CODES: ReadonlySet<GameErrorCode> = new Set<GameErrorCode>([
  "NOT_AUTHENTICATED",
  "NOT_FOUND",
  "FORBIDDEN",
  "INVALID_INPUT",
  "INSUFFICIENT_FUNDS",
  "PLOT_OCCUPIED",
  "MAX_LEVEL",
  "DUPLICATE_REQUEST",
]);

export interface DbErrorLike {
  message: string;
  details?: string | null;
}

export function toGameError(error: DbErrorLike): GameError {
  const code = error.message as GameErrorCode;
  if (KNOWN_CODES.has(code)) {
    return new GameError(code, error.details || "Request failed.");
  }
  return new GameError("UNKNOWN", "Something went wrong. Please try again.");
}
