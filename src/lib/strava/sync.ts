// BACKEND-OWNED. SERVER ONLY. Stores Strava connections and imports
// activities. Uses the service-role client because webhooks arrive without a
// player session and tokens must never be readable by players.
//
// Rewards are still decided by the database (import_strava_activity ->
// private.record_workout), with the same rules as manual workouts.
import type { AdminClient } from "@/lib/supabase/admin";
import { toGameError } from "@/lib/supabase/errors";
import type { Rewards } from "@/types/game";
import { mapStravaActivity, type SkipReason, type StravaActivity } from "./activity";
import {
  getActivity,
  listActivitiesSince,
  refreshTokens,
  StravaApiError,
  type StravaTokenResponse,
} from "./api";
import type { StravaConfig } from "./config";

/** Refresh the access token if it expires within this many seconds. */
const REFRESH_MARGIN_S = 5 * 60;
const LOOKBACK_S = 7 * 24 * 60 * 60;

// ---------------------------------------------------------------------------
// Connections and tokens
// ---------------------------------------------------------------------------

export type SaveConnectionResult = "ok" | "already_linked";

/** Called after a player approves us on Strava. */
export async function saveConnection(
  admin: AdminClient,
  userId: string,
  tokens: StravaTokenResponse,
  scope: string,
): Promise<SaveConnectionResult> {
  const athlete = tokens.athlete;
  if (!athlete) throw new Error("Strava token response had no athlete");

  const existing = await admin
    .from("strava_connections")
    .select("user_id")
    .eq("athlete_id", athlete.id)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data && existing.data.user_id !== userId) return "already_linked";

  const athleteName = [athlete.firstname, athlete.lastname].filter(Boolean).join(" ").slice(0, 100);
  const { error } = await admin.from("strava_connections").upsert({
    user_id: userId,
    athlete_id: athlete.id,
    athlete_name: athleteName,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(tokens.expires_at * 1000).toISOString(),
    scope,
  });
  // 23505: the same athlete was linked by someone else at the same moment.
  if (error?.code === "23505") return "already_linked";
  if (error) throw error;
  return "ok";
}

export async function deleteConnection(admin: AdminClient, userId: string): Promise<void> {
  const { error } = await admin.from("strava_connections").delete().eq("user_id", userId);
  if (error) throw error;
}

/**
 * A usable access token for the player, refreshing it if needed. Returns null
 * if they aren't connected, or if Strava says they revoked access (then the
 * connection is deleted).
 */
export async function getValidAccessToken(
  admin: AdminClient,
  config: StravaConfig,
  userId: string,
  { forceRefresh = false } = {},
): Promise<string | null> {
  const { data: row, error } = await admin
    .from("strava_connections")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const expiresInS = (new Date(row.expires_at).getTime() - Date.now()) / 1000;
  if (!forceRefresh && expiresInS > REFRESH_MARGIN_S) return row.access_token;

  let tokens: StravaTokenResponse;
  try {
    tokens = await refreshTokens(config, row.refresh_token);
  } catch (e) {
    // Only a rejected refresh token means "revoked". If Strava rejected our
    // app's own credentials (misconfigured secret), keep every connection.
    if (!(e instanceof StravaApiError) || (e.status !== 400 && e.status !== 401) || e.isAppError) throw e;

    // Strava rotates refresh tokens. If another request refreshed in the
    // meantime, ours is stale but the stored one works.
    const again = await admin
      .from("strava_connections")
      .select("access_token, refresh_token")
      .eq("user_id", userId)
      .maybeSingle();
    if (again.data && again.data.refresh_token !== row.refresh_token) return again.data.access_token;

    // Otherwise the player revoked access on Strava.
    await deleteConnection(admin, userId);
    return null;
  }

  const { error: updateError } = await admin
    .from("strava_connections")
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(tokens.expires_at * 1000).toISOString(),
    })
    .eq("user_id", userId);
  if (updateError) throw updateError;
  return tokens.access_token;
}

// ---------------------------------------------------------------------------
// Importing
// ---------------------------------------------------------------------------

export type ImportOutcome =
  | { status: "imported"; rewards: Rewards }
  | { status: "duplicate" }
  | { status: "skipped"; reason: SkipReason | "overlap" | "claimed" | "daily_limit" };

interface ImportRpcResult {
  status: "imported" | "duplicate" | "overlap" | "claimed";
  gold?: number;
  materials?: number;
  xp?: number;
}

export async function importActivity(
  admin: AdminClient,
  userId: string,
  raw: StravaActivity,
): Promise<ImportOutcome> {
  const mapped = mapStravaActivity(raw);
  if (!mapped.ok) return { status: "skipped", reason: mapped.reason };
  const a = mapped.activity;

  const { data, error } = await admin.rpc("import_strava_activity", {
    p_user_id: userId,
    p_strava_activity_id: a.activityId,
    p_type: a.type,
    p_started_at: a.startedAt,
    p_duration_minutes: a.durationMinutes,
    p_distance_km: a.distanceKm,
  });
  if (error) {
    const gameError = toGameError(error);
    if (gameError.code === "RATE_LIMITED") return { status: "skipped", reason: "daily_limit" };
    if (gameError.code === "INVALID_INPUT") return { status: "skipped", reason: "invalid" };
    throw gameError;
  }

  const result = data as unknown as ImportRpcResult;
  switch (result.status) {
    case "imported":
      return {
        status: "imported",
        rewards: { gold: result.gold ?? 0, materials: result.materials ?? 0, xp: result.xp ?? 0 },
      };
    case "duplicate":
      return { status: "duplicate" };
    default:
      return { status: "skipped", reason: result.status };
  }
}

export interface SyncSummary {
  imported: number;
  skipped: number;
  rewards: Rewards;
}

/** Imports the last 7 days of activities. Null if the player isn't connected. */
export async function syncRecentActivities(
  admin: AdminClient,
  config: StravaConfig,
  userId: string,
): Promise<SyncSummary | null> {
  const token = await getValidAccessToken(admin, config, userId);
  if (!token) return null;

  const since = Math.floor(Date.now() / 1000) - LOOKBACK_S;
  const activities = await listActivitiesSince(token, since);
  // Oldest first, so a daily limit cuts off the newest rather than random ones.
  activities.sort((x, y) => x.start_date.localeCompare(y.start_date));

  const summary: SyncSummary = { imported: 0, skipped: 0, rewards: { gold: 0, materials: 0, xp: 0 } };
  for (const activity of activities) {
    const outcome = await importActivity(admin, userId, activity);
    if (outcome.status === "imported") {
      summary.imported += 1;
      summary.rewards.gold += outcome.rewards.gold;
      summary.rewards.materials += outcome.rewards.materials;
      summary.rewards.xp += outcome.rewards.xp;
    } else if (outcome.status === "skipped") {
      summary.skipped += 1;
    }
  }

  const { error } = await admin
    .from("strava_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw error;
  return summary;
}

// ---------------------------------------------------------------------------
// Webhook events
// ---------------------------------------------------------------------------

/** https://developers.strava.com/docs/webhooks/ */
export interface StravaWebhookEvent {
  object_type: "activity" | "athlete";
  object_id: number;
  aspect_type: "create" | "update" | "delete";
  owner_id: number;
  subscription_id: number;
  event_time: number;
  updates?: Record<string, string>;
}

export function isWebhookEvent(body: unknown): body is StravaWebhookEvent {
  if (typeof body !== "object" || body === null) return false;
  const e = body as Record<string, unknown>;
  return (
    (e.object_type === "activity" || e.object_type === "athlete") &&
    (e.aspect_type === "create" || e.aspect_type === "update" || e.aspect_type === "delete") &&
    Number.isSafeInteger(e.object_id) &&
    Number.isSafeInteger(e.owner_id)
  );
}

/**
 * Handles one webhook event. Webhooks aren't signed, so an event is only a
 * hint: we act on what Strava's API says with the player's own token.
 *
 * - New activity: import it.
 * - Activity edited or deleted: ignored. Rewards already paid are kept.
 * - Player revoked access on Strava: confirmed by trying to refresh their
 *   token, then their connection is deleted.
 */
export async function handleWebhookEvent(
  admin: AdminClient,
  config: StravaConfig,
  event: StravaWebhookEvent,
): Promise<void> {
  const isNewActivity = event.object_type === "activity" && event.aspect_type === "create";
  const isDeauthorization = event.object_type === "athlete" && event.updates?.authorized === "false";
  if (!isNewActivity && !isDeauthorization) return;

  const { data: connection, error } = await admin
    .from("strava_connections")
    .select("user_id")
    .eq("athlete_id", event.owner_id)
    .maybeSingle();
  if (error) throw error;
  if (!connection) return;

  if (isDeauthorization) {
    await getValidAccessToken(admin, config, connection.user_id, { forceRefresh: true });
    return;
  }

  const token = await getValidAccessToken(admin, config, connection.user_id);
  if (!token) return;

  let activity: StravaActivity;
  try {
    activity = await getActivity(token, event.object_id);
  } catch (e) {
    if (e instanceof StravaApiError && e.status === 404) return; // deleted already
    throw e;
  }
  await importActivity(admin, connection.user_id, activity);
}
