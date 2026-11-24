// BACKEND-OWNED. SERVER ONLY. Strava app settings from environment variables.
// See docs/DEPLOY.md ("Strava") for how to create the app and set these.

export interface StravaConfig {
  clientId: string;
  clientSecret: string;
  /** Random string we chose when creating the webhook subscription. */
  webhookVerifyToken: string | undefined;
}

/** Null when Strava isn't set up (the UI then hides "Connect Strava"). */
export function stravaConfig(): StravaConfig | null {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return { clientId, clientSecret, webhookVerifyToken: process.env.STRAVA_WEBHOOK_VERIFY_TOKEN };
}

/**
 * activity:read_all also covers activities set to "Only You", which is the
 * default for many people. We only ever show a player their own activities.
 */
export const STRAVA_SCOPE = "activity:read_all";

/** Strava sends back the scopes the player actually granted (they can untick). */
export function hasActivityScope(grantedScope: string | null): boolean {
  const scopes = (grantedScope ?? "").split(/[ ,]+/);
  return scopes.includes("activity:read_all") || scopes.includes("activity:read");
}

/** Short-lived cookie that ties the OAuth callback to the player who started it. */
export const OAUTH_STATE_COOKIE = "strava_oauth_state";
