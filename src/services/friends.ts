"use server";
// BACKEND-OWNED. Real implementation backed by Supabase (server actions).
// Friendship is request + accept. Friends can view each other's kingdoms
// (read-only, see getKingdom) and appear on each other's weekly leaderboard.
import { asActionResult, toGameError } from "@/lib/supabase/errors";
import {
  GameError,
  type ActionResult,
  type FriendProfile,
  type FriendRequest,
  type LeaderboardEntry,
} from "@/types/game";
import { toFriendProfile, toFriendRequest, toLeaderboardEntry } from "./mappers";
import { requireUser } from "./session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getFriends(): Promise<FriendProfile[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("get_friends");
  if (error) throw toGameError(error);
  return data.map(toFriendProfile);
}

export async function getWeeklyLeaderboard(): Promise<LeaderboardEntry[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("get_weekly_leaderboard");
  if (error) throw toGameError(error);
  return data.map(toLeaderboardEntry);
}

export async function getFriendRequests(): Promise<FriendRequest[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("get_friend_requests");
  if (error) throw toGameError(error);
  return data.map(toFriendRequest);
}

export async function sendFriendRequest(
  username: string,
): Promise<ActionResult<{ status: "pending" | "accepted" }>> {
  return asActionResult(async () => {
    const name = typeof username === "string" ? username.trim() : "";
    if (!name) throw new GameError("INVALID_INPUT", "Enter a username.");

    const { supabase } = await requireUser();
    const { data, error } = await supabase.rpc("send_friend_request", { p_username: name });
    if (error) throw toGameError(error);

    const { status } = data as { status: "pending" | "accepted" };
    return { status };
  });
}

export async function respondToFriendRequest(
  requestId: string,
  accept: boolean,
): Promise<ActionResult<{ status: "accepted" | "declined" }>> {
  return asActionResult(async () => {
    if (!UUID_PATTERN.test(requestId)) {
      throw new GameError("NOT_FOUND", "That friend request no longer exists.");
    }

    const { supabase } = await requireUser();
    const { data, error } = await supabase.rpc("respond_to_friend_request", {
      p_friendship_id: requestId,
      p_accept: accept === true,
    });
    if (error) throw toGameError(error);

    const { status } = data as { status: "accepted" | "declined" };
    return { status };
  });
}

export async function removeFriend(userId: string): Promise<ActionResult<null>> {
  return asActionResult(async () => {
    if (!UUID_PATTERN.test(userId)) return null; // nothing to remove

    const { supabase } = await requireUser();
    const { error } = await supabase.rpc("remove_friend", { p_user_id: userId });
    if (error) throw toGameError(error);
    return null;
  });
}
