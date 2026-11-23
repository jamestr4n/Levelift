"use server";
// BACKEND-OWNED. Sign-up / sign-in / sign-out as server actions.
// Callable from both Server and Client Components via `@/services`.
import { createClient } from "@/lib/supabase/server";
import {
  authFailure,
  mapAuthError,
  normaliseUsername,
  USERNAME_PATTERN,
  validateSignUp,
} from "@/lib/auth/errors";
import type { AuthResult, SignInInput, SignUpInput } from "@/types/game";

export async function signUp(input: SignUpInput): Promise<AuthResult> {
  const invalid = validateSignUp(input);
  if (invalid) return invalid;

  const username = normaliseUsername(input.username);
  if (!(await isUsernameAvailable(username))) {
    return authFailure("USERNAME_TAKEN", "That username is already taken.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: { data: { username } },
  });
  if (error) return mapAuthError(error);

  // No session means the hosted project requires email confirmation first.
  return { ok: true, needsEmailConfirmation: !data.session };
}

export async function signIn(input: SignInInput): Promise<AuthResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email.trim(),
    password: input.password,
  });
  if (error) return mapAuthError(error);
  return { ok: true, needsEmailConfirmation: false };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const name = normaliseUsername(username);
  if (!USERNAME_PATTERN.test(name)) return false;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_username_available", { name });
  if (error) throw new Error(`is_username_available failed: ${error.message}`);
  return data === true;
}
