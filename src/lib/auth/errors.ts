// BACKEND-OWNED. Turns Supabase Auth errors into player-friendly results.
import type { AuthResult, GameErrorCode } from "@/types/game";

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
export const MIN_PASSWORD_LENGTH = 8;

export function normaliseUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function authFailure(code: GameErrorCode, message: string): AuthResult {
  return { ok: false, code, message };
}

/** Minimal shape of a Supabase AuthError, so this stays easy to unit test. */
export interface AuthErrorLike {
  code?: string;
  status?: number;
  message: string;
}

export function mapAuthError(error: AuthErrorLike): AuthResult {
  switch (error.code) {
    case "invalid_credentials":
      return authFailure("INVALID_CREDENTIALS", "Wrong email or password.");
    case "email_exists":
    case "user_already_exists":
      return authFailure("EMAIL_TAKEN", "An account with this email already exists.");
    case "weak_password":
      return authFailure("INVALID_INPUT", "Please choose a stronger password.");
    case "email_address_invalid":
    case "validation_failed":
      return authFailure("INVALID_INPUT", "Please check your email and password.");
    case "email_not_confirmed":
      return authFailure("INVALID_CREDENTIALS", "Please confirm your email first.");
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return authFailure("RATE_LIMITED", "Too many attempts. Please wait a moment and try again.");
    default:
      return authFailure("UNKNOWN", "Something went wrong. Please try again.");
  }
}

/** Checks sign-up input before contacting Supabase. Returns null when valid. */
export function validateSignUp(input: {
  email: string;
  password: string;
  username: string;
}): AuthResult | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    return authFailure("INVALID_INPUT", "Please enter a valid email address.");
  }
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return authFailure("INVALID_INPUT", `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (!USERNAME_PATTERN.test(normaliseUsername(input.username))) {
    return authFailure("INVALID_INPUT", "Username must be 3-20 letters, numbers or underscores.");
  }
  return null;
}
