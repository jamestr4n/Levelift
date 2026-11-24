/**
 * The ONLY entry point the UI should import game data from:
 *
 *   import { logWorkout } from "@/services";
 *
 * Set NEXT_PUBLIC_USE_MOCKS=true in .env.local to use mock data while the
 * real backend functions are not ready.
 */
import type { GameService } from "@/types/game";
import { mockService } from "./mock";
import * as auth from "./auth";
import * as player from "./player";
import * as workouts from "./workouts";
import * as kingdom from "./kingdom";
import * as friends from "./friends";
import * as strava from "./strava";

const realService: GameService = { ...auth, ...player, ...workouts, ...kingdom, ...friends, ...strava };

const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

// Safety net: never ship the fake backend to real players. VERCEL_ENV is only
// set on the server, so this check runs during the Vercel production build.
if (useMocks && process.env.VERCEL_ENV === "production") {
  throw new Error("NEXT_PUBLIC_USE_MOCKS must be false in Vercel production.");
}

const service: GameService = useMocks ? mockService : realService;

export const {
  signUp,
  signIn,
  signOut,
  isUsernameAvailable,
  getCurrentPlayer,
  getCharacter,
  logWorkout,
  getWorkoutHistory,
  getKingdom,
  purchaseBuilding,
  upgradeBuilding,
  getFriends,
  getWeeklyLeaderboard,
  sendFriendRequest,
  getFriendRequests,
  respondToFriendRequest,
  removeFriend,
  getStravaStatus,
  syncStrava,
  disconnectStrava,
} = service;
