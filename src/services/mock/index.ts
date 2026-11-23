// FRONTEND-OWNED. Development-only mock data. Never used in production.
import type { GameService, PlayerProfile } from "@/types/game";

const mockPlayer: PlayerProfile = {
  id: "mock-user",
  username: "mock_hero",
  displayName: "Mock Hero",
  level: 3,
  xp: 120,
  xpToNextLevel: 300,
  gold: 250,
  materials: 40,
  kingdomScore: 15,
};

export const mockService: GameService = {
  // Auth always succeeds in mock mode.
  async signUp() {
    return { ok: true, needsEmailConfirmation: false };
  },
  async signIn() {
    return { ok: true, needsEmailConfirmation: false };
  },
  async signOut() {},
  async isUsernameAvailable(username) {
    return /^[a-z0-9_]{3,20}$/.test(username.trim().toLowerCase());
  },
  async getCurrentPlayer() {
    return mockPlayer;
  },
  async getCharacter() {
    return { userId: mockPlayer.id, outfit: "starter", unlockedOutfits: ["starter"] };
  },
  async logWorkout(input) {
    const rewards = { gold: 20, materials: 5, xp: 30 };
    return {
      workout: {
        id: crypto.randomUUID(),
        userId: mockPlayer.id,
        type: input.type,
        startedAt: input.startedAt,
        durationMinutes: input.durationMinutes,
        distanceKm: input.distanceKm,
        sets: input.sets,
        rewards,
        createdAt: new Date().toISOString(),
      },
      rewards,
      dailyLimitReached: false,
      leveledUp: false,
      player: mockPlayer,
    };
  },
  async getWorkoutHistory() {
    return [];
  },
  async getKingdom(userId) {
    return {
      ownerId: userId ?? mockPlayer.id,
      gridWidth: 5,
      gridHeight: 5,
      buildings: [{ id: "b1", type: "town_hall", level: 1, position: { x: 2, y: 2 } }],
      kingdomScore: mockPlayer.kingdomScore,
      canEdit: !userId || userId === mockPlayer.id,
    };
  },
  async purchaseBuilding(input) {
    return {
      building: { id: crypto.randomUUID(), type: input.type, level: 1, position: input.position },
      player: mockPlayer,
    };
  },
  async upgradeBuilding(buildingId) {
    return {
      building: { id: buildingId, type: "house", level: 2, position: { x: 0, y: 0 } },
      player: mockPlayer,
    };
  },
  async getFriends() {
    return [];
  },
  async getWeeklyLeaderboard() {
    return [];
  },
};
