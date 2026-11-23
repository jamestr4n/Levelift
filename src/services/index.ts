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

const realService: GameService = { ...auth, ...player, ...workouts, ...kingdom, ...friends };

const service: GameService =
  process.env.NEXT_PUBLIC_USE_MOCKS === "true" ? mockService : realService;

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
} = service;
