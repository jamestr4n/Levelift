"use server";
// BACKEND-OWNED. Real implementation backed by Supabase (server actions).
import { createClient } from "@/lib/supabase/server";
import { GameError, type CharacterState, type PlayerProfile } from "@/types/game";
import { toCharacterState, toPlayerProfile } from "./mappers";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new GameError("NOT_AUTHENTICATED", "You need to sign in.");
  return { supabase, userId: user.id };
}

export async function getCurrentPlayer(): Promise<PlayerProfile> {
  const { supabase, userId } = await requireUser();

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

export async function getCharacter(): Promise<CharacterState> {
  const { supabase, userId } = await requireUser();

  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) throw new GameError("NOT_FOUND", "Character not found.");
  return toCharacterState(data);
}
