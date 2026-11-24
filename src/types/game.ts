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
  /** XP earned towards the next level (resets to 0 on level-up). */
  xp: number;
  /** XP needed to go from the current level to the next one. */
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
  /** Where the workout came from. Absent means "manual". */
  source?: WorkoutSource;
  /** Set when source is "strava": link to https://www.strava.com/activities/<id>. */
  stravaActivityId?: number;
}

export type WorkoutSource = "manual" | "strava";

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

/** A player you're not (yet) friends with: no Kingdom Score until they accept. */
export interface PlayerSummary {
  id: string;
  username: string;
  displayName: string;
  level: number;
}

export interface FriendRequest {
  id: string;
  /** incoming = they asked you (you can accept/decline); outgoing = you asked them. */
  direction: "incoming" | "outgoing";
  user: PlayerSummary;
  createdAt: string;
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

// ---------- Strava ----------

/**
 * To connect, send the player to this path with a normal link (full page
 * navigation, not fetch). After Strava, they come back to
 * /workouts?strava=<StravaConnectOutcome>, plus &imported=<n> on "connected".
 */
export const STRAVA_CONNECT_PATH = "/api/strava/connect";

export type StravaConnectOutcome =
  | "connected"
  | "denied" // the player clicked Cancel on Strava
  | "missing_scope" // the player unticked "View data about your activities"
  | "already_linked" // this Strava account is linked to another Levelift player
  | "unavailable" // Strava isn't set up on this server
  | "error";

export type StravaStatus =
  /** Strava isn't set up on this server: hide the Connect button. */
  | { available: false }
  | { available: true; connected: false }
  | {
      available: true;
      connected: true;
      athleteName: string;
      connectedAt: string;
      lastSyncedAt: string | null;
    };

export interface StravaSyncResult {
  /** Activities turned into workouts by this sync. */
  imported: number;
  /** New activities that weren't imported (unsupported sport, too old, overlaps a logged workout, daily limit). */
  skipped: number;
  /** Total rewards from the imported activities. */
  rewards: Rewards;
  player: PlayerProfile;
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
  | "USERNAME_TAKEN"
  | "EMAIL_TAKEN"
  | "INVALID_CREDENTIALS"
  | "RATE_LIMITED"
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

// ---------- Auth ----------

export interface SignUpInput {
  email: string;
  password: string;
  /** 3-20 characters: letters, numbers or underscores. Stored lowercase. */
  username: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

/**
 * Auth functions return errors as values instead of throwing, because Next.js
 * hides thrown error messages from server actions in production. `message` is
 * safe to show to the player.
 */
export type AuthResult =
  | {
      ok: true;
      /** True when the player must click an email link before signing in (hosted only). */
      needsEmailConfirmation: boolean;
    }
  | { ok: false; code: GameErrorCode; message: string };

/**
 * Result of an action that can fail in ways the player should see.
 * Returned instead of thrown, because Next.js hides thrown server-action
 * errors in production. `message` is safe to show to the player.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: GameErrorCode; message: string };

// ---------- Service interface ----------

/**
 * Every function the UI may call. The real implementation (src/services/*)
 * and the mock (src/services/mock) must both satisfy this interface.
 */
export interface GameService {
  signUp(input: SignUpInput): Promise<AuthResult>;
  signIn(input: SignInInput): Promise<AuthResult>;
  signOut(): Promise<void>;
  isUsernameAvailable(username: string): Promise<boolean>;

  getCurrentPlayer(): Promise<PlayerProfile>;
  getCharacter(): Promise<CharacterState>;
  logWorkout(input: WorkoutInput): Promise<WorkoutRewardResult>;
  getWorkoutHistory(): Promise<Workout[]>;
  getKingdom(userId?: string): Promise<KingdomState>;
  purchaseBuilding(input: PurchaseBuildingInput): Promise<PurchaseResult>;
  upgradeBuilding(buildingId: string): Promise<UpgradeResult>;
  getFriends(): Promise<FriendProfile[]>;
  getWeeklyLeaderboard(): Promise<LeaderboardEntry[]>;

  /**
   * Ask a player to be friends. If they had already asked you, this accepts
   * it (status "accepted"). Asking again while pending is harmless.
   */
  sendFriendRequest(username: string): Promise<ActionResult<{ status: "pending" | "accepted" }>>;
  /** Pending requests to and from you, newest first. */
  getFriendRequests(): Promise<FriendRequest[]>;
  /** Accept or decline an incoming request (by FriendRequest.id). */
  respondToFriendRequest(
    requestId: string,
    accept: boolean,
  ): Promise<ActionResult<{ status: "accepted" | "declined" }>>;
  /** Unfriend someone, or cancel/decline a pending request with them (by user id). */
  removeFriend(userId: string): Promise<ActionResult<null>>;

  getStravaStatus(): Promise<StravaStatus>;
  /**
   * Import the player's Strava activities from the last 7 days. New ones are
   * also imported automatically (webhook), so this is a manual refresh.
   * Each activity pays at most once. RATE_LIMITED if run again within a minute.
   */
  syncStrava(): Promise<ActionResult<StravaSyncResult>>;
  /** Unlink Strava. Workouts already imported, and their rewards, are kept. */
  disconnectStrava(): Promise<ActionResult<null>>;
}
