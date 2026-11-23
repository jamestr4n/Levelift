"use server";
// BACKEND-OWNED. Real implementation backed by Supabase (server actions).
import { GameError, type CharacterState, type PlayerProfile } from "@/types/game";
import { toCharacterState } from "./mappers";
import { loadPlayer, requireUser } from "./session";

export async function getCurrentPlayer(): Promise<PlayerProfile> {
  const { supabase, userId } = await requireUser();
  return loadPlayer(supabase, userId);
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
