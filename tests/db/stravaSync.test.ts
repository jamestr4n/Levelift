/**
 * Server-side Strava logic (src/lib/strava/sync.ts) against local Supabase,
 * with Strava's API faked by stubbing fetch.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StravaActivity } from "@/lib/strava/activity";
import type { StravaConfig } from "@/lib/strava/config";
import {
  claimSyncSlot,
  getValidAccessToken,
  handleDeauthorization,
  handleWebhookEvent,
  importActivity,
} from "@/lib/strava/sync";
import { adminClient, dbTestsEnabled, newPlayer } from "./helpers";

const CONFIG: StravaConfig = {
  clientId: "1",
  clientSecret: "s",
  webhookVerifyToken: "v",
  webhookSubscriptionId: undefined,
};

let nextAthleteId = Date.now() + 5_000_000;
let nextActivityId = Date.now() * 10 + 5_000_000;

async function connectedPlayer({ expired = false } = {}) {
  const p = await newPlayer();
  const athleteId = nextAthleteId++;
  const { error } = await adminClient().from("strava_connections").insert({
    user_id: p.user.id,
    athlete_id: athleteId,
    access_token: "old-access",
    refresh_token: "old-refresh",
    expires_at: new Date(Date.now() + (expired ? -60_000 : 3_600_000)).toISOString(),
    scope: "activity:read_all",
  });
  if (error) throw error;
  return { ...p, athleteId };
}

async function connection(userId: string) {
  const { data } = await adminClient()
    .from("strava_connections")
    .select("access_token, refresh_token")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

function run(athleteId: number, overrides: Partial<StravaActivity> = {}): StravaActivity {
  return {
    id: nextActivityId++,
    sport_type: "Run",
    start_date: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    moving_time: 30 * 60,
    elapsed_time: 30 * 60,
    distance: 5000,
    athlete: { id: athleteId },
    ...overrides,
  };
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const NEW_TOKENS = { access_token: "new-access", refresh_token: "new-refresh", expires_at: Date.now() / 1000 + 21600 };
const REJECTED_REFRESH = { message: "Bad Request", errors: [{ resource: "RefreshToken", field: "refresh_token", code: "invalid" }] };
const BAD_APP = { message: "Authorization Error", errors: [{ resource: "Application", field: "", code: "invalid" }] };

/** Stubs fetch for strava.com only; Supabase calls go through untouched. */
function fakeStrava(handler: (url: string) => Response | Promise<Response>) {
  const realFetch = globalThis.fetch;
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    return url.startsWith("https://www.strava.com") ? handler(url) : realFetch(input, init);
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe.skipIf(!dbTestsEnabled)("importActivity ownership", () => {
  it("imports the linked athlete's own activity", async () => {
    const p = await connectedPlayer();
    const outcome = await importActivity(createAdminClient(), { userId: p.user.id, athleteId: p.athleteId }, run(p.athleteId));
    expect(outcome).toMatchObject({ status: "imported", rewards: { gold: 60 } });
  });

  it("refuses an activity that belongs to someone else, and pays nothing", async () => {
    const p = await connectedPlayer();
    const someoneElses = run(p.athleteId + 999_999);
    const outcome = await importActivity(createAdminClient(), { userId: p.user.id, athleteId: p.athleteId }, someoneElses);
    expect(outcome).toEqual({ status: "skipped", reason: "not_owner" });

    const wallet = await p.client.from("wallets").select("gold").single();
    expect(wallet.data!.gold).toBe(0);
  });

  it("a forged webhook naming someone else's activity imports nothing", async () => {
    const p = await connectedPlayer();
    const someoneElses = run(p.athleteId + 999_999);
    fakeStrava(() => json(200, someoneElses));

    await handleWebhookEvent(createAdminClient(), CONFIG, {
      object_type: "activity",
      aspect_type: "create",
      object_id: someoneElses.id,
      owner_id: p.athleteId,
      subscription_id: 1,
      event_time: 0,
    });
    const workouts = await p.client.from("workouts").select("id");
    expect(workouts.data).toEqual([]);
  });
});

describe.skipIf(!dbTestsEnabled)("token refresh", () => {
  it("refreshes an expired token and stores the rotated one", async () => {
    const p = await connectedPlayer({ expired: true });
    fakeStrava(() => json(200, NEW_TOKENS));

    const access = await getValidAccessToken(createAdminClient(), CONFIG, p.user.id);
    expect(access).toEqual({ accessToken: "new-access", athleteId: p.athleteId });
    expect(await connection(p.user.id)).toEqual({ access_token: "new-access", refresh_token: "new-refresh" });
  });

  it("a rejected refresh returns null but never deletes the connection", async () => {
    const p = await connectedPlayer({ expired: true });
    fakeStrava(() => json(400, REJECTED_REFRESH));

    expect(await getValidAccessToken(createAdminClient(), CONFIG, p.user.id)).toBeNull();
    expect(await connection(p.user.id)).not.toBeNull();
  });

  it("a misconfigured app secret throws and keeps the connection", async () => {
    const p = await connectedPlayer({ expired: true });
    fakeStrava(() => json(401, BAD_APP));

    await expect(getValidAccessToken(createAdminClient(), CONFIG, p.user.id)).rejects.toThrow(/Application/);
    expect(await connection(p.user.id)).not.toBeNull();
  });
});

describe.skipIf(!dbTestsEnabled)("handleDeauthorization", () => {
  it("keeps the connection when the refresh token still works (forged event)", async () => {
    const p = await connectedPlayer();
    fakeStrava(() => json(200, NEW_TOKENS));

    expect(await handleDeauthorization(createAdminClient(), CONFIG, p.user.id, { confirmDelayMs: 0 })).toBe("kept");
    expect(await connection(p.user.id)).toEqual({ access_token: "new-access", refresh_token: "new-refresh" });
  });

  it("deletes the connection when Strava rejects the refresh token (real revoke)", async () => {
    const p = await connectedPlayer();
    fakeStrava(() => json(400, REJECTED_REFRESH));

    expect(await handleDeauthorization(createAdminClient(), CONFIG, p.user.id, { confirmDelayMs: 0 })).toBe("deleted");
    expect(await connection(p.user.id)).toBeNull();
  });

  it("keeps the connection if a parallel request rotated the token meanwhile", async () => {
    const p = await connectedPlayer();
    fakeStrava(async () => {
      // Another request refreshes successfully while ours is being rejected.
      await adminClient().from("strava_connections").update({ refresh_token: "rotated" }).eq("user_id", p.user.id);
      return json(400, REJECTED_REFRESH);
    });

    expect(await handleDeauthorization(createAdminClient(), CONFIG, p.user.id, { confirmDelayMs: 0 })).toBe("kept");
    expect(await connection(p.user.id)).toMatchObject({ refresh_token: "rotated" });
  });

  it("keeps the connection when our app credentials are wrong", async () => {
    const p = await connectedPlayer();
    fakeStrava(() => json(401, BAD_APP));

    await expect(handleDeauthorization(createAdminClient(), CONFIG, p.user.id, { confirmDelayMs: 0 })).rejects.toThrow();
    expect(await connection(p.user.id)).not.toBeNull();
  });
});

describe.skipIf(!dbTestsEnabled)("claimSyncSlot", () => {
  it("lets exactly one of several simultaneous syncs through", async () => {
    const p = await connectedPlayer();
    const admin = createAdminClient();
    const results = await Promise.all([1, 2, 3, 4].map(() => claimSyncSlot(admin, p.user.id, 60_000)));
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("allows another sync once the cooldown has passed", async () => {
    const p = await connectedPlayer();
    const admin = createAdminClient();
    await adminClient()
      .from("strava_connections")
      .update({ last_synced_at: new Date(Date.now() - 61_000).toISOString() })
      .eq("user_id", p.user.id);
    expect(await claimSyncSlot(admin, p.user.id, 60_000)).toBe(true);
    expect(await claimSyncSlot(admin, p.user.id, 60_000)).toBe(false);
  });
});
