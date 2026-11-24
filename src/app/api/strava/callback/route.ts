// BACKEND-OWNED (route handler, not a page). Strava sends the player here
// after they approve (or cancel) on Strava. We store the connection, import
// the last 7 days, and send them to /workouts?strava=<StravaConnectOutcome>.
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { exchangeCode } from "@/lib/strava/api";
import { hasActivityScope, OAUTH_STATE_COOKIE, stravaConfig } from "@/lib/strava/config";
import { saveConnection, syncRecentActivities } from "@/lib/strava/sync";
import type { StravaConnectOutcome } from "@/types/game";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  const finish = (outcome: StravaConnectOutcome, imported?: number) => {
    const url = new URL("/workouts", request.url);
    url.searchParams.set("strava", outcome);
    if (imported !== undefined) url.searchParams.set("imported", String(imported));
    const response = NextResponse.redirect(url);
    response.cookies.delete({ name: OAUTH_STATE_COOKIE, path: "/api/strava" });
    return response;
  };

  const config = stravaConfig();
  if (!config) return finish("unavailable");

  const state = searchParams.get("state");
  if (!expectedState || state !== expectedState) return finish("error");
  if (searchParams.get("error")) return finish("denied");

  const code = searchParams.get("code");
  if (!code) return finish("error");
  const scope = searchParams.get("scope");
  if (!hasActivityScope(scope)) return finish("missing_scope");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const admin = createAdminClient();
  try {
    const tokens = await exchangeCode(config, code);
    const saved = await saveConnection(admin, user.id, tokens, scope ?? "");
    if (saved === "already_linked") return finish("already_linked");
  } catch (e) {
    console.error("Strava connect failed", e);
    return finish("error");
  }

  // Connected. Importing recent activities is a bonus: if it fails, the
  // webhook and "Sync now" still work.
  try {
    const summary = await syncRecentActivities(admin, config, user.id);
    return finish("connected", summary?.imported ?? 0);
  } catch (e) {
    console.error("Strava first sync failed", e);
    return finish("connected", 0);
  }
}
