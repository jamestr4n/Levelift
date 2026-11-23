// BACKEND-OWNED. Real implementation backed by Supabase.
import type { CharacterState, PlayerProfile } from "@/types/game";
import { notImplemented } from "./notImplemented";

export async function getCurrentPlayer(): Promise<PlayerProfile> {
  return notImplemented("getCurrentPlayer");
}

export async function getCharacter(): Promise<CharacterState> {
  return notImplemented("getCharacter");
}
