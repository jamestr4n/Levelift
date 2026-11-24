"use server";
// BACKEND-OWNED. Strava server actions. Connecting happens through the
// /api/strava/connect and /api/strava/callback routes (an OAuth redirect
// can't be a server action); this file covers status, sync and disconnect.
import { createAdminClient } from "@/lib/supabase/admin";
import { asActionResult, toGameError } from "@/lib/supabase/errors";
import { revokeToken } from "@/lib/strava/api";
import { stravaConfig } from "@/lib/strava/config";
import { deleteConnection, getValidAccessToken, syncRecentActivities } from "@/lib/strava/sync";
import {
  GameError,
  type ActionResult,
  type StravaStatus,
  type StravaSyncResult,
} from "@/types/game";
import { loadPlayer, requireUser } from "./session";

/** Minimum time between two "Sync now" presses, to stay within Strava's rate limits. */
const SYNC_COOLDOWN_MS = 60_000;

async function currentConnection() {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase.rpc("get_strava_connection");
  if (error) throw toGameError(error);
  return { supabase, userId, connection: data[0] ?? null };
}

export async function getStravaStatus(): Promise<StravaStatus> {
  if (!stravaConfig()) return { available: false };

  const { connection } = await currentConnection();
  if (!connection) return { available: true, connected: false };
  return {
    available: true,
    connected: true,
    athleteName: connection.athlete_name,
    connectedAt: connection.connected_at,
    lastSyncedAt: connection.last_synced_at,
  };
}

export async function syncStrava(): Promise<ActionResult<StravaSyncResult>> {
  return asActionResult(async () => {
    const config = stravaConfig();
    if (!config) throw new GameError("NOT_FOUND", "Strava isn't available right now.");

    const { supabase, userId, connection } = await currentConnection();
    if (!connection) throw new GameError("NOT_FOUND", "Connect Strava first.");

    const last = connection.last_synced_at ? new Date(connection.last_synced_at).getTime() : 0;
    if (Date.now() - last < SYNC_COOLDOWN_MS) {
      throw new GameError("RATE_LIMITED", "Synced a moment ago. Try again in a minute.");
    }

    const summary = await syncRecentActivities(createAdminClient(), config, userId);
    if (!summary) throw new GameError("NOT_FOUND", "Strava access was removed. Connect again.");

    return { ...summary, player: await loadPlayer(supabase, userId) };
  });
}

export async function disconnectStrava(): Promise<ActionResult<null>> {
  return asActionResult(async () => {
    const config = stravaConfig();
    if (!config) return null;

    const { userId, connection } = await currentConnection();
    if (!connection) return null;

    const admin = createAdminClient();
    // Best effort: tell Strava to drop our access too. Forget it locally either way.
    try {
      const token = await getValidAccessToken(admin, config, userId);
      if (token) await revokeToken(config, token);
    } catch (e) {
      console.error("Strava revoke failed", e);
    }
    await deleteConnection(admin, userId);
    return null;
  });
}
