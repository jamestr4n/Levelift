// BACKEND-OWNED. Converts database rows (snake_case) into contract types (camelCase).
import type { Tables } from "@/types/database";
import type { Database } from "@/types/database";
import type {
  BuildingType,
  CharacterState,
  FriendProfile,
  FriendRequest,
  KingdomState,
  LeaderboardEntry,
  OutfitId,
  OwnedBuilding,
  PlayerProfile,
  Workout,
  WorkoutSource,
  WorkoutType,
} from "@/types/game";
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
    source: row.source as WorkoutSource,
    ...(row.strava_activity_id !== null && { stravaActivityId: row.strava_activity_id }),
  };
}

export function toOwnedBuilding(
  row: Pick<Tables<"owned_buildings">, "id" | "type" | "level" | "x" | "y">,
): OwnedBuilding {
  return {
    id: row.id,
    type: row.type as BuildingType,
    level: row.level,
    position: { x: row.x, y: row.y },
  };
}

export function toKingdomState(
  kingdom: Tables<"kingdoms">,
  buildings: Array<Pick<Tables<"owned_buildings">, "id" | "type" | "level" | "x" | "y">>,
  viewerId: string,
): KingdomState {
  return {
    ownerId: kingdom.user_id,
    gridWidth: kingdom.grid_width,
    gridHeight: kingdom.grid_height,
    buildings: buildings.map(toOwnedBuilding),
    kingdomScore: kingdom.kingdom_score,
    canEdit: kingdom.user_id === viewerId,
  };
}

type Rpc<Name extends keyof Database["public"]["Functions"]> =
  Database["public"]["Functions"][Name]["Returns"] extends Array<infer Row> ? Row : never;

export function toFriendProfile(row: Rpc<"get_friends">): FriendProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    level: row.level,
    kingdomScore: row.kingdom_score,
  };
}

export function toFriendRequest(row: Rpc<"get_friend_requests">): FriendRequest {
  return {
    id: row.id,
    direction: row.direction as FriendRequest["direction"],
    user: {
      id: row.user_id,
      username: row.username,
      displayName: row.display_name,
      level: row.level,
    },
    createdAt: row.created_at,
  };
}

export function toLeaderboardEntry(row: Rpc<"get_weekly_leaderboard">): LeaderboardEntry {
  return {
    rank: row.rank,
    userId: row.user_id,
    displayName: row.display_name,
    weeklyKingdomScore: row.weekly_kingdom_score,
    weeklyXp: row.weekly_xp,
    isCurrentUser: row.is_current_user,
  };
}
