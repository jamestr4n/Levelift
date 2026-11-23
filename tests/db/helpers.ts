import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Database tests only run through `npm run test:db`, against local Supabase
 * (`npm run db:start`). Plain `npm test` skips them so it works without Docker.
 */
export const dbTestsEnabled = process.env.SUPABASE_DB_TESTS === "1";

export type Client = SupabaseClient<Database>;

export function anonClient(): Client {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see `npx supabase status -o env`).",
    );
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function randomUsername(prefix = "test"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export const TEST_PASSWORD = "test-password-123";

/** Signs up a fresh player and returns a client signed in as them. */
export async function newPlayer(username = randomUsername()) {
  const client = anonClient();
  const email = `${username}@example.test`;
  const { data, error } = await client.auth.signUp({
    email,
    password: TEST_PASSWORD,
    options: { data: { username } },
  });
  if (error) throw error;
  if (!data.user || !data.session) throw new Error("Sign-up did not return a session");
  return { client, user: data.user, username, email };
}

/**
 * Admin client (bypasses RLS) for TEST SETUP ONLY, e.g. giving a player Gold
 * beyond the daily reward cap. Uses the local service-role key from .env.local.
 */
export function adminClient(): Client {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Set SUPABASE_SERVICE_ROLE_KEY in .env.local (SERVICE_ROLE_KEY from `npx supabase status -o env`).",
    );
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Test setup: set a player's wallet directly. */
export async function setFunds(userId: string, gold: number, materials: number) {
  const { error } = await adminClient().from("wallets").update({ gold, materials }).eq("user_id", userId);
  if (error) throw error;
}
