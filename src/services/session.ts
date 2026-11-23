// BACKEND-OWNED. Server-only helpers shared by the service files.
// Not a server action module: never import this from UI code.
import { createClient } from "@/lib/supabase/server";
import { GameError, type PlayerProfile } from "@/types/game";
import { toPlayerProfile } from "./mappers";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Returns a Supabase client for the signed-in player, or throws NOT_AUTHENTICATED. */
export async function requireUser(): Promise<{ supabase: Supabase; userId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new GameError("NOT_AUTHENTICATED", "You need to sign in.");
  return { supabase, userId: user.id };
}

export async function loadPlayer(supabase: Supabase, userId: string): Promise<PlayerProfile> {
  const [profile, wallet, kingdom] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("wallets").select("gold, materials").eq("user_id", userId).single(),
    supabase.from("kingdoms").select("kingdom_score").eq("user_id", userId).single(),
  ]);

  if (profile.error || wallet.error || kingdom.error) {
    throw new GameError("NOT_FOUND", "Player data not found.");
  }
  return toPlayerProfile(profile.data, wallet.data, kingdom.data);
}
