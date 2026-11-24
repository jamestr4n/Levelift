// FRONTEND-OWNED. Development-only mock data. Never used in production.
// State lives in server memory and resets when the dev server restarts. Only
// reach it through ./actions so browser and server share this one copy.
// Prices and rewards here are made up for UI work only; the real values come
// from the backend.
import {
  GameError,
  type BuildingType,
  type CharacterState,
  type FriendProfile,
  type FriendRequest,
  type GameService,
  type KingdomState,
  type OwnedBuilding,
  type PlayerProfile,
  type Rewards,
  type Workout,
  type WorkoutRewardResult,
} from "@/types/game";

const MOCK_LATENCY_MS = 300;
const DAILY_REWARDED_WORKOUTS = 3;

const buildingCatalog: Record<
  BuildingType,
  { costs: Array<{ gold: number; materials: number }>; scoreByLevel: number[] }
> = {
  town_hall: { costs: [{ gold: 0, materials: 0 }, { gold: 300, materials: 60 }, { gold: 600, materials: 120 }], scoreByLevel: [15, 35, 60] },
  house: { costs: [{ gold: 100, materials: 10 }, { gold: 150, materials: 25 }, { gold: 250, materials: 50 }], scoreByLevel: [5, 10, 18] },
  farm: { costs: [{ gold: 120, materials: 20 }, { gold: 180, materials: 35 }, { gold: 280, materials: 60 }], scoreByLevel: [6, 12, 20] },
  workshop: { costs: [{ gold: 180, materials: 40 }, { gold: 260, materials: 60 }, { gold: 400, materials: 90 }], scoreByLevel: [8, 16, 28] },
};

const player: PlayerProfile = {
  id: "mock-user",
  username: "mock_hero",
  displayName: "Mock Hero",
  level: 3,
  xp: 120,
  xpToNextLevel: 300,
  gold: 250,
  materials: 40,
  kingdomScore: 0,
};

const character: CharacterState = {
  userId: player.id,
  outfit: "starter",
  unlockedOutfits: ["starter", "ranger"],
};

const myKingdom: KingdomState = {
  ownerId: player.id,
  gridWidth: 5,
  gridHeight: 5,
  buildings: [{ id: "b-town-hall", type: "town_hall", level: 1, position: { x: 2, y: 2 } }],
  kingdomScore: 0,
  canEdit: true,
};
syncKingdomScore();

const friends: FriendProfile[] = [
  { id: "mock-friend-1", username: "iron_ivy", displayName: "Ivy", level: 5, kingdomScore: 48 },
  { id: "mock-friend-2", username: "trail_tom", displayName: "Tom", level: 2, kingdomScore: 21 },
  { id: "mock-friend-3", username: "cycle_sam", displayName: "Sam", level: 4, kingdomScore: 33 },
];

const friendKingdoms: Record<string, OwnedBuilding[]> = {
  "mock-friend-1": [
    { id: "f1-th", type: "town_hall", level: 2, position: { x: 2, y: 2 } },
    { id: "f1-h1", type: "house", level: 1, position: { x: 1, y: 2 } },
    { id: "f1-fa", type: "farm", level: 1, position: { x: 3, y: 1 } },
  ],
  "mock-friend-2": [
    { id: "f2-th", type: "town_hall", level: 1, position: { x: 2, y: 2 } },
    { id: "f2-h1", type: "house", level: 1, position: { x: 2, y: 3 } },
  ],
  "mock-friend-3": [
    { id: "f3-th", type: "town_hall", level: 1, position: { x: 2, y: 2 } },
    { id: "f3-ws", type: "workshop", level: 1, position: { x: 0, y: 0 } },
    { id: "f3-h1", type: "house", level: 2, position: { x: 4, y: 3 } },
  ],
};

const weeklyStats: Record<string, { weeklyKingdomScore: number; weeklyXp: number }> = {
  [player.id]: { weeklyKingdomScore: 5, weeklyXp: 90 },
  "mock-friend-1": { weeklyKingdomScore: 18, weeklyXp: 240 },
  "mock-friend-2": { weeklyKingdomScore: 5, weeklyXp: 60 },
  "mock-friend-3": { weeklyKingdomScore: 12, weeklyXp: 150 },
};

const workouts: Workout[] = [
  seedWorkout("w-1", "running", 1, 30, { distanceKm: 5 }),
  seedWorkout("w-2", "strength", 2, 45, { sets: 12 }),
  seedWorkout("w-3", "cycling", 4, 60, { distanceKm: 18 }),
  seedWorkout("w-4", "walking", 6, 40, { distanceKm: 3.5 }),
];

const resultsByRequestId = new Map<string, WorkoutRewardResult>();

// --- Friend requests (added by backend in week 4; change freely) ----------
// Other players you can find by username but aren't friends with yet.
const strangers = [
  { id: "mock-stranger-1", username: "lift_lena", displayName: "Lena", level: 6, kingdomScore: 52 },
  { id: "mock-stranger-2", username: "row_raj", displayName: "Raj", level: 3, kingdomScore: 24 },
];

// One incoming request so the UI has something to accept.
const friendRequests: FriendRequest[] = [
  {
    id: "req-1",
    direction: "incoming",
    user: { id: "mock-stranger-2", username: "row_raj", displayName: "Raj", level: 3 },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

function becomeFriends(userId: string) {
  const stranger = strangers.find((s) => s.id === userId);
  if (stranger && !friends.some((f) => f.id === userId)) {
    friends.push({ ...stranger });
    weeklyStats[userId] ??= { weeklyKingdomScore: 0, weeklyXp: 0 };
    friendKingdoms[userId] ??= [
      { id: `${userId}-th`, type: "town_hall", level: 1, position: { x: 2, y: 2 } },
    ];
  }
}

function seedWorkout(
  id: string,
  type: Workout["type"],
  daysAgo: number,
  durationMinutes: number,
  extra: { distanceKm?: number; sets?: number },
): Workout {
  const startedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
  return {
    id,
    userId: player.id,
    type,
    startedAt,
    durationMinutes,
    ...extra,
    rewards: mockRewards(durationMinutes),
    createdAt: startedAt,
  };
}

function mockRewards(durationMinutes: number): Rewards {
  return {
    gold: Math.round(durationMinutes * 0.8),
    materials: Math.round(durationMinutes * 0.2),
    xp: durationMinutes,
  };
}

function delay() {
  return new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
}

// Callers get copies so UI code can't accidentally mutate mock state.
function copy<T>(value: T): T {
  return structuredClone(value);
}

function scoreOf(buildings: OwnedBuilding[]): number {
  return buildings.reduce((sum, b) => sum + buildingCatalog[b.type].scoreByLevel[b.level - 1], 0);
}

function syncKingdomScore() {
  myKingdom.kingdomScore = scoreOf(myKingdom.buildings);
  player.kingdomScore = myKingdom.kingdomScore;
}

function spend(cost: { gold: number; materials: number }) {
  if (player.gold < cost.gold || player.materials < cost.materials) {
    throw new GameError("INSUFFICIENT_FUNDS", "Not enough Gold or Materials");
  }
  player.gold -= cost.gold;
  player.materials -= cost.materials;
}

function addScoreThisWeek(before: number) {
  weeklyStats[player.id].weeklyKingdomScore += player.kingdomScore - before;
}

function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

export const mockStore: GameService = {
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
    await delay();
    return copy(player);
  },

  async getCharacter() {
    await delay();
    return copy(character);
  },

  async logWorkout(input) {
    await delay();
    const previous = resultsByRequestId.get(input.clientRequestId);
    if (previous) return copy(previous);

    if (input.durationMinutes <= 0 || input.durationMinutes > 600) {
      throw new GameError("INVALID_INPUT", "Duration must be between 1 and 600 minutes");
    }

    const rewardedToday = workouts.filter((w) => isToday(w.createdAt) && w.rewards.xp > 0).length;
    const dailyLimitReached = rewardedToday >= DAILY_REWARDED_WORKOUTS;
    const rewards = dailyLimitReached
      ? { gold: 0, materials: 0, xp: 0 }
      : mockRewards(input.durationMinutes);

    player.gold += rewards.gold;
    player.materials += rewards.materials;
    player.xp += rewards.xp;
    weeklyStats[player.id].weeklyXp += rewards.xp;

    let leveledUp = false;
    while (player.xp >= player.xpToNextLevel) {
      player.xp -= player.xpToNextLevel;
      player.level += 1;
      player.xpToNextLevel = player.level * 100;
      leveledUp = true;
    }

    const workout: Workout = {
      id: crypto.randomUUID(),
      userId: player.id,
      type: input.type,
      startedAt: input.startedAt,
      durationMinutes: input.durationMinutes,
      distanceKm: input.distanceKm,
      sets: input.sets,
      rewards,
      createdAt: new Date().toISOString(),
    };
    workouts.unshift(workout);

    const result: WorkoutRewardResult = {
      workout,
      rewards,
      dailyLimitReached,
      leveledUp,
      player: copy(player),
    };
    resultsByRequestId.set(input.clientRequestId, result);
    return copy(result);
  },

  async getWorkoutHistory() {
    await delay();
    return copy(workouts);
  },

  async getKingdom(userId) {
    await delay();
    if (!userId || userId === player.id) return copy(myKingdom);

    const buildings = friendKingdoms[userId];
    if (!buildings) throw new GameError("NOT_FOUND", "Kingdom not found");
    return copy({
      ownerId: userId,
      gridWidth: 5,
      gridHeight: 5,
      buildings,
      kingdomScore: scoreOf(buildings),
      canEdit: false,
    });
  },

  async purchaseBuilding({ type, position }) {
    await delay();
    if (type === "town_hall") {
      throw new GameError("INVALID_INPUT", "Your kingdom already has a Town Hall");
    }
    const { x, y } = position;
    if (x < 0 || y < 0 || x >= myKingdom.gridWidth || y >= myKingdom.gridHeight) {
      throw new GameError("INVALID_INPUT", "That plot is outside your kingdom");
    }
    if (myKingdom.buildings.some((b) => b.position.x === x && b.position.y === y)) {
      throw new GameError("PLOT_OCCUPIED", "That plot already has a building");
    }

    spend(buildingCatalog[type].costs[0]);
    const before = player.kingdomScore;
    const building: OwnedBuilding = { id: crypto.randomUUID(), type, level: 1, position: { x, y } };
    myKingdom.buildings.push(building);
    syncKingdomScore();
    addScoreThisWeek(before);
    return copy({ building, player });
  },

  async upgradeBuilding(buildingId) {
    await delay();
    const building = myKingdom.buildings.find((b) => b.id === buildingId);
    if (!building) throw new GameError("NOT_FOUND", "Building not found");

    const { costs } = buildingCatalog[building.type];
    if (building.level >= costs.length) {
      throw new GameError("MAX_LEVEL", "This building is already at max level");
    }

    spend(costs[building.level]);
    const before = player.kingdomScore;
    building.level += 1;
    syncKingdomScore();
    addScoreThisWeek(before);
    return copy({ building, player });
  },

  async getFriends() {
    await delay();
    // Keep each friend's score in step with their mock kingdom.
    return copy(
      friends.map((f) => (friendKingdoms[f.id] ? { ...f, kingdomScore: scoreOf(friendKingdoms[f.id]) } : f)),
    );
  },

  async getWeeklyLeaderboard() {
    await delay();
    const people = [
      { userId: player.id, displayName: player.displayName },
      ...friends.map((f) => ({ userId: f.id, displayName: f.displayName })),
    ];
    return people
      .map((p) => ({ ...p, ...weeklyStats[p.userId], isCurrentUser: p.userId === player.id }))
      .sort((a, b) => b.weeklyKingdomScore - a.weeklyKingdomScore || b.weeklyXp - a.weeklyXp)
      .map((entry, i) => ({ rank: i + 1, ...entry }));
  },

  // --- Friend requests (return results instead of throwing) ---------------

  async sendFriendRequest(username) {
    await delay();
    const name = username.trim().toLowerCase();
    if (name === player.username) {
      return { ok: false, code: "INVALID_INPUT", message: "You can't add yourself as a friend." };
    }
    if (friends.some((f) => f.username === name)) {
      return { ok: true, data: { status: "accepted" } };
    }
    const stranger = strangers.find((s) => s.username === name);
    if (!stranger) {
      return { ok: false, code: "NOT_FOUND", message: "No player has that username." };
    }

    const existing = friendRequests.find((r) => r.user.id === stranger.id);
    if (existing?.direction === "incoming") {
      friendRequests.splice(friendRequests.indexOf(existing), 1);
      becomeFriends(stranger.id);
      return { ok: true, data: { status: "accepted" } };
    }
    if (!existing) {
      const { kingdomScore: _score, ...user } = stranger;
      void _score;
      friendRequests.unshift({
        id: crypto.randomUUID(),
        direction: "outgoing",
        user,
        createdAt: new Date().toISOString(),
      });
    }
    return { ok: true, data: { status: "pending" } };
  },

  async getFriendRequests() {
    await delay();
    return copy(friendRequests);
  },

  async respondToFriendRequest(requestId, accept) {
    await delay();
    const request = friendRequests.find((r) => r.id === requestId && r.direction === "incoming");
    if (!request) {
      return { ok: false, code: "NOT_FOUND", message: "That friend request no longer exists." };
    }
    friendRequests.splice(friendRequests.indexOf(request), 1);
    if (accept) becomeFriends(request.user.id);
    return { ok: true, data: { status: accept ? "accepted" : "declined" } };
  },

  async removeFriend(userId) {
    await delay();
    const i = friends.findIndex((f) => f.id === userId);
    if (i >= 0) friends.splice(i, 1);
    const r = friendRequests.findIndex((req) => req.user.id === userId);
    if (r >= 0) friendRequests.splice(r, 1);
    return { ok: true, data: null };
  },
};
