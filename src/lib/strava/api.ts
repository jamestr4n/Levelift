// BACKEND-OWNED. SERVER ONLY. Minimal Strava API client (plain fetch).
// Docs: https://developers.strava.com/docs/authentication/ and /docs/reference/
import type { StravaConfig } from "./config";
import type { StravaActivity } from "./activity";

const STRAVA = "https://www.strava.com";
const TIMEOUT_MS = 8_000;

export class StravaApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** `errors[].resource` from Strava's error body, e.g. "Application", "RefreshToken". */
    public readonly resources: string[] = [],
  ) {
    super(message);
    this.name = "StravaApiError";
  }

  /** Our own client id/secret were rejected: a server config problem, not the player's. */
  get isAppError(): boolean {
    return this.resources.includes("Application");
  }
}

async function apiError(res: Response, what: string): Promise<StravaApiError> {
  let resources: string[] = [];
  try {
    const body = (await res.json()) as { errors?: Array<{ resource?: string }> };
    resources = (body.errors ?? []).map((e) => e.resource ?? "").filter(Boolean);
  } catch {
    // Not JSON: keep the status only.
  }
  const detail = resources.length ? ` (${resources.join(", ")})` : "";
  return new StravaApiError(res.status, `Strava ${what} failed: ${res.status}${detail}`, resources);
}

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  /** Unix time in seconds. */
  expires_at: number;
}

export interface StravaTokenResponse extends StravaTokens {
  /** Only included when exchanging an authorization code. */
  athlete?: { id: number; firstname?: string | null; lastname?: string | null };
}

async function strava<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${STRAVA}${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw await apiError(res, `${init.method ?? "GET"} ${path.split("?")[0]}`);
  return (await res.json()) as T;
}

function tokenRequest(config: StravaConfig, params: Record<string, string>) {
  return strava<StravaTokenResponse>("/oauth/token", {
    method: "POST",
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, ...params }),
  });
}

export function authorizeUrl(config: StravaConfig, redirectUri: string, state: string, scope: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope,
    state,
  });
  return `${STRAVA}/oauth/authorize?${params}`;
}

export function exchangeCode(config: StravaConfig, code: string) {
  return tokenRequest(config, { code, grant_type: "authorization_code" });
}

/** Strava rotates refresh tokens: always store the one this returns. */
export function refreshTokens(config: StravaConfig, refreshToken: string) {
  return tokenRequest(config, { refresh_token: refreshToken, grant_type: "refresh_token" });
}

/** Revokes all of this athlete's tokens for our app (used on disconnect). */
export async function revokeToken(config: StravaConfig, token: string): Promise<void> {
  const res = await fetch(`${STRAVA}/oauth/revoke`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}` },
    body: new URLSearchParams({ token }),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw await apiError(res, "revoke");
}

export function getActivity(accessToken: string, activityId: number) {
  return strava<StravaActivity>(`/api/v3/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/** The athlete's activities that started after `afterUnixSeconds`, up to 100. */
export function listActivitiesSince(accessToken: string, afterUnixSeconds: number) {
  const params = new URLSearchParams({ after: String(afterUnixSeconds), per_page: "100" });
  return strava<StravaActivity[]>(`/api/v3/athlete/activities?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
