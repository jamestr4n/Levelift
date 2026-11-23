// BACKEND-OWNED. Converts database rows (snake_case) into contract types (camelCase).
import type { Tables } from "@/types/database";
import type { CharacterState, OutfitId, PlayerProfile, Workout, WorkoutType } from "@/types/game";
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

export function toWorkout(row: Tables<"workouts">): Workout {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as WorkoutType,
    startedAt: row.started_at,
    durationMinutes: row.duration_minutes,
    ...(row.distance_km !== null && { distanceKm: Number(row.distance_km) }),
    ...(row.sets !== null && { sets: row.sets }),
    rewards: {
      gold: row.gold_awarded,
      materials: row.materials_awarded,
      xp: row.xp_awarded,
    },
    createdAt: row.created_at,
  };
}
