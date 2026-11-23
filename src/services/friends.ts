// BACKEND-OWNED. Real implementation backed by Supabase.
import type { FriendProfile, LeaderboardEntry } from "@/types/game";
import { notImplemented } from "./notImplemented";

export async function getFriends(): Promise<FriendProfile[]> {
  return notImplemented("getFriends");
}

export async function getWeeklyLeaderboard(): Promise<LeaderboardEntry[]> {
  return notImplemented("getWeeklyLeaderboard");
}
