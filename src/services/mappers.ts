// BACKEND-OWNED. Converts database rows (snake_case) into contract types (camelCase).
import type { Tables } from "@/types/database";
import type { CharacterState, OutfitId, PlayerProfile } from "@/types/game";
import { xpToNextLevel } from "@/lib/rewards/levels";

export function toPlayerProfile(
  profile: Tables<"profiles">,
  wallet: Pick<Tables<"wallets">, "gold" | "materials">,
  kingdom: Pick<Tables<"kingdoms">, "kingdom_score">,
): PlayerProfile {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    level: profile.level,
    xp: profile.xp,
    xpToNextLevel: xpToNextLevel(profile.level),
    gold: wallet.gold,
    materials: wallet.materials,
    kingdomScore: kingdom.kingdom_score,
  };
}

export function toCharacterState(character: Tables<"characters">): CharacterState {
  return {
    userId: character.user_id,
    outfit: character.outfit as OutfitId,
    unlockedOutfits: character.unlocked_outfits as OutfitId[],
  };
}
