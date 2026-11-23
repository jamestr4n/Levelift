/**
 * SHARED CONTRACT between frontend and backend.
 *
 * Both developers depend on this file. Change it only in a small, dedicated
 * pull request that the other developer reviews. Never change it silently.
 *
 * All currency and score values are integers.
 */

// ---------- Player & character ----------

export interface PlayerProfile {
  id: string;
  username: string;
  displayName: string;
  level: number;
  xp: number;
  /** XP needed to reach the next level. */
  xpToNextLevel: number;
  gold: number;
  materials: number;
  kingdomScore: number;
}

export type OutfitId = "starter" | "ranger" | "knight" | "mage";

export interface CharacterState {
  userId: string;
  outfit: OutfitId;
  unlockedOutfits: OutfitId[];
}

// ---------- Workouts & rewards ----------

export type WorkoutType = "running" | "walking" | "cycling" | "strength";

export interface WorkoutInput {
  type: WorkoutType;
  /** ISO 8601 timestamp of when the workout started. */
  startedAt: string;
  durationMinutes: number;
  /** Running, walking, cycling. */
  distanceKm?: number;
  /** Strength training. */
  sets?: number;
  /**
   * Client-generated id (e.g. crypto.randomUUID()) so retrying the same
   * submission never awards rewards twice.
   */
  clientRequestId: string;
}

export interface Workout {
  id: string;
  userId: string;
  type: WorkoutType;
  startedAt: string;
  durationMinutes: number;
  distanceKm?: number;
  sets?: number;
  rewards: Rewards;
  createdAt: string;
}

export interface Rewards {
  gold: number;
  materials: number;
  xp: number;
}

export interface WorkoutRewardResult {
  workout: Workout;
  rewards: Rewards;
  /** True when a daily limit reduced the rewards. */
  dailyLimitReached: boolean;
  leveledUp: boolean;
  player: PlayerProfile;
}

// ---------- Kingdom ----------

export type BuildingType = "town_hall" | "house" | "farm" | "workshop";

export interface BuildingDefinition {
  type: BuildingType;
  name: string;
  maxLevel: number;
  /** Cost to buy (index 0) and to upgrade to each later level. */
  costs: Array<{ gold: number; materials: number }>;
  /** Kingdom score contributed at each level. */
  scoreByLevel: number[];
}

export interface PlotPosition {
  x: number;
  y: number;
}

export interface OwnedBuilding {
  id: string;
  type: BuildingType;
  level: number;
  position: PlotPosition;
}

export interface KingdomState {
  ownerId: string;
  gridWidth: number;
  gridHeight: number;
  buildings: OwnedBuilding[];
  kingdomScore: number;
  /** False when viewing a friend's kingdom (read-only). */
  canEdit: boolean;
}

export interface PurchaseBuildingInput {
  type: BuildingType;
  position: PlotPosition;
}

export interface PurchaseResult {
  building: OwnedBuilding;
  player: PlayerProfile;
}

export interface UpgradeResult {
  building: OwnedBuilding;
  player: PlayerProfile;
}

// ---------- Friends & leaderboard ----------

export interface FriendProfile {
  id: string;
  username: string;
  displayName: string;
  level: number;
  kingdomScore: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  /** Kingdom score gained since the start of the current week. */
  weeklyKingdomScore: number;
  weeklyXp: number;
  isCurrentUser: boolean;
}

// ---------- Errors ----------

export type GameErrorCode =
  | "NOT_AUTHENTICATED"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "INSUFFICIENT_FUNDS"
  | "PLOT_OCCUPIED"
  | "MAX_LEVEL"
  | "DUPLICATE_REQUEST"
  | "NOT_IMPLEMENTED"
  | "UNKNOWN";

export class GameError extends Error {
  constructor(
    public readonly code: GameErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "GameError";
  }
}

// ---------- Service interface ----------

/**
 * Every function the UI may call. The real implementation (src/services/*)
 * and the mock (src/services/mock) must both satisfy this interface.
 */
export interface GameService {
  getCurrentPlayer(): Promise<PlayerProfile>;
  getCharacter(): Promise<CharacterState>;
  logWorkout(input: WorkoutInput): Promise<WorkoutRewardResult>;
  getWorkoutHistory(): Promise<Workout[]>;
  getKingdom(userId?: string): Promise<KingdomState>;
  purchaseBuilding(input: PurchaseBuildingInput): Promise<PurchaseResult>;
  upgradeBuilding(buildingId: string): Promise<UpgradeResult>;
  getFriends(): Promise<FriendProfile[]>;
  getWeeklyLeaderboard(): Promise<LeaderboardEntry[]>;
}
