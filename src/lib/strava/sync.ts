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

export interface StravaAccess {
  accessToken: string;
  /** The Strava athlete this player linked. Activities must belong to them. */
  athleteId: number;
}

function isRejectedRefresh(e: unknown): boolean {
  // Strava rejected the player's refresh token (revoked, or rotated by a
  // parallel request). If it rejected our app's own credentials
  // (misconfigured secret), that's not the player's doing.
  return e instanceof StravaApiError && (e.status === 400 || e.status === 401) && !e.isAppError;
}

/** Stores refreshed tokens, unless another request already replaced `oldRefreshToken`. */
async function saveRefreshedTokens(
  admin: AdminClient,
  userId: string,
  oldRefreshToken: string,
  tokens: StravaTokenResponse,
): Promise<boolean> {
  const { data, error } = await admin
    .from("strava_connections")
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(tokens.expires_at * 1000).toISOString(),
    })
    .eq("user_id", userId)
    .eq("refresh_token", oldRefreshToken)
    .select("user_id");
  if (error) throw error;
  return data.length > 0;
}

/**
 * A usable access token for the player, refreshing it if needed. Returns null
 * if they aren't connected or Strava rejects their refresh token. It never
 * deletes the connection: only a confirmed deauthorization does that.
 */
export async function getValidAccessToken(
  admin: AdminClient,
  config: StravaConfig,
  userId: string,
): Promise<StravaAccess | null> {
  const { data: row, error } = await admin
    .from("strava_connections")
    .select("athlete_id, access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const expiresInS = (new Date(row.expires_at).getTime() - Date.now()) / 1000;
  if (expiresInS > REFRESH_MARGIN_S) return { accessToken: row.access_token, athleteId: row.athlete_id };

  let tokens: StravaTokenResponse | null = null;
  try {
    tokens = await refreshTokens(config, row.refresh_token);
  } catch (e) {
    if (!isRejectedRefresh(e)) throw e;
  }

  if (tokens && (await saveRefreshedTokens(admin, userId, row.refresh_token, tokens))) {
    return { accessToken: tokens.access_token, athleteId: row.athlete_id };
  }

  // Our refresh failed or lost a race: use whatever a parallel request stored.
  const again = await admin
    .from("strava_connections")
    .select("access_token, refresh_token")
    .eq("user_id", userId)
    .maybeSingle();
  if (again.error) throw again.error;
  if (again.data && again.data.refresh_token !== row.refresh_token) {
    return { accessToken: again.data.access_token, athleteId: row.athlete_id };
  }
  return null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** How long to wait before trusting that a rejected refresh token means "revoked". */
const REVOKE_CONFIRM_DELAY_MS = 5_000;

/**
 * Strava said the player revoked access. Webhooks aren't signed, so confirm
 * it: if their refresh token still works, nothing happened. If it's rejected,
 * wait, then delete only if no parallel request has rotated the token since
 * (a rotation would also make ours be rejected).
 */
export async function handleDeauthorization(
  admin: AdminClient,
  config: StravaConfig,
  userId: string,
  { confirmDelayMs = REVOKE_CONFIRM_DELAY_MS } = {},
): Promise<"kept" | "deleted"> {
  const { data: row, error } = await admin
    .from("strava_connections")
    .select("refresh_token")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!row) return "kept";

  try {
    const tokens = await refreshTokens(config, row.refresh_token);
    await saveRefreshedTokens(admin, userId, row.refresh_token, tokens);
    return "kept";
  } catch (e) {
    if (!isRejectedRefresh(e)) throw e;
  }

  await sleep(confirmDelayMs);
  const { data: deleted, error: deleteError } = await admin
    .from("strava_connections")
    .delete()
    .eq("user_id", userId)
    .eq("refresh_token", row.refresh_token)
    .select("user_id");
  if (deleteError) throw deleteError;
  return deleted.length > 0 ? "deleted" : "kept";
}

// ---------------------------------------------------------------------------
// Importing
// ---------------------------------------------------------------------------

export type ImportOutcome =
  | { status: "imported"; rewards: Rewards }
  | { status: "duplicate" }
  | { status: "skipped"; reason: SkipReason | "overlap" | "claimed" | "daily_limit" | "not_owner" };

interface ImportRpcResult {
  status: "imported" | "duplicate" | "overlap" | "claimed";
  gold?: number;
  materials?: number;
  xp?: number;
}

export async function importActivity(
  admin: AdminClient,
  access: { userId: string; athleteId: number },
  raw: StravaActivity,
): Promise<ImportOutcome> {
  const { userId } = access;
  // Only the linked athlete's own activities. A token can sometimes read other
  // people's public activities, and a forged webhook could name one.
  if (raw.athlete?.id !== access.athleteId) return { status: "skipped", reason: "not_owner" };

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

/**
 * Starts a manual sync if the last one was at least `cooldownMs` ago. One
 * UPDATE, so two clicks at the same moment can't both get through.
 */
export async function claimSyncSlot(admin: AdminClient, userId: string, cooldownMs: number): Promise<boolean> {
  const cutoff = new Date(Date.now() - cooldownMs).toISOString();
  const { data, error } = await admin
    .from("strava_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("user_id", userId)
    .or(`last_synced_at.is.null,last_synced_at.lt.${cutoff}`)
    .select("user_id");
  if (error) throw error;
  return data.length > 0;
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
  const access = await getValidAccessToken(admin, config, userId);
  if (!access) return null;

  const since = Math.floor(Date.now() / 1000) - LOOKBACK_S;
  const activities = await listActivitiesSince(access.accessToken, since);
  // Oldest first, so a daily limit cuts off the newest rather than random ones.
  activities.sort((x, y) => x.start_date.localeCompare(y.start_date));

  const summary: SyncSummary = { imported: 0, skipped: 0, rewards: { gold: 0, materials: 0, xp: 0 } };
  for (const activity of activities) {
    const outcome = await importActivity(admin, { userId, athleteId: access.athleteId }, activity);
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
 * - New activity: import it, if Strava confirms it belongs to the athlete.
 * - Activity edited or deleted: ignored. Rewards already paid are kept.
 * - Player revoked access on Strava: confirmed first (handleDeauthorization).
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
    await handleDeauthorization(admin, config, connection.user_id);
    return;
  }

  // Already imported (e.g. a retried event): no need to ask Strava again.
  const existing = await admin
    .from("workouts")
    .select("id")
    .eq("strava_activity_id", event.object_id)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return;

  const access = await getValidAccessToken(admin, config, connection.user_id);
  if (!access) return;

  let activity: StravaActivity;
  try {
    activity = await getActivity(access.accessToken, event.object_id);
  } catch (e) {
    if (e instanceof StravaApiError && (e.status === 404 || e.status === 403)) return;
    throw e;
  }
  await importActivity(admin, { userId: connection.user_id, athleteId: access.athleteId }, activity);
}
