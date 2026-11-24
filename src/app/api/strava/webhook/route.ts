// BACKEND-OWNED (route handler, not a page). Strava webhook endpoint.
// Public (no session): see PUBLIC_PATHS in src/lib/supabase/middleware.ts.
// Setup: docs/DEPLOY.md ("Strava").
import { after, NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stravaConfig } from "@/lib/strava/config";
import { handleWebhookEvent, isWebhookEvent } from "@/lib/strava/sync";

/** Subscription handshake: echo the challenge if the verify token matches. */
export async function GET(request: NextRequest) {
  const config = stravaConfig();
  const params = request.nextUrl.searchParams;
  if (
    !config?.webhookVerifyToken ||
    params.get("hub.mode") !== "subscribe" ||
    params.get("hub.verify_token") !== config.webhookVerifyToken
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ "hub.challenge": params.get("hub.challenge") ?? "" });
}

/**
 * An event. Strava needs a 200 within 2 seconds, so we answer at once and do
 * the work after responding. Strava retries (3 tries in total) only if we
 * don't answer 200, and importing is idempotent anyway.
 */
export async function POST(request: NextRequest) {
  const config = stravaConfig();
  const body: unknown = await request.json().catch(() => null);
  if (!config || !isWebhookEvent(body)) return NextResponse.json({ ok: true });
  // Not a secret (it's in every event), but filters out casual forgeries.
  if (config.webhookSubscriptionId !== undefined && body.subscription_id !== config.webhookSubscriptionId) {
    return NextResponse.json({ ok: true });
  }

  after(async () => {
    try {
      await handleWebhookEvent(createAdminClient(), config, body);
    } catch (e) {
      console.error("Strava webhook event failed", e);
    }
  });
  return NextResponse.json({ ok: true });
}
