// BACKEND-OWNED (route handler, not a page). Starts "Connect Strava": sends
// the signed-in player to Strava's approval page. Strava sends them back to
// /api/strava/callback.
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeUrl } from "@/lib/strava/api";
import { OAUTH_STATE_COOKIE, STRAVA_SCOPE, stravaConfig } from "@/lib/strava/config";

export async function GET(request: NextRequest) {
  const config = stravaConfig();
  if (!config) return redirectToWorkouts(request, "unavailable");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  // Random state in a short-lived cookie: the callback only accepts a reply
  // to a request this browser started (prevents login CSRF).
  const state = randomUUID();
  const redirectUri = new URL("/api/strava/callback", request.url).toString();
  const response = NextResponse.redirect(authorizeUrl(config, redirectUri, state, STRAVA_SCOPE));
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/api/strava",
    maxAge: 10 * 60,
  });
  return response;
}

function redirectToWorkouts(request: NextRequest, outcome: string) {
  const url = new URL("/workouts", request.url);
  url.searchParams.set("strava", outcome);
  return NextResponse.redirect(url);
}
