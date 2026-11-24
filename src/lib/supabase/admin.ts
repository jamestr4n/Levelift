// BACKEND-OWNED. SERVER ONLY. Supabase client with the service-role key,
// which bypasses row-level security.
//
// Used only where no player session exists or a player must not see the
// data: Strava webhooks and OAuth tokens (src/lib/strava). Never import this
// from UI code or a "use client" file, and never expose its results raw.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type AdminClient = ReturnType<typeof createAdminClient>;

export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("The admin Supabase client must never run in the browser.");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set (needed for Strava).");
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
