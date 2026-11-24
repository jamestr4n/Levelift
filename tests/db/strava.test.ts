import { describe, expect, it } from "vitest";
import { adminClient, dbTestsEnabled, newPlayer } from "./helpers";

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

let nextAthleteId = Date.now();
let nextActivityId = Date.now() * 10;

/** Test setup: link a player to a fake Strava athlete. */
async function connect(userId: string) {
  const athleteId = nextAthleteId++;
  const { error } = await adminClient().from("strava_connections").insert({
    user_id: userId,
    athlete_id: athleteId,
    athlete_name: "Test Athlete",
    access_token: "secret-access",
    refresh_token: "secret-refresh",
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
    scope: "read,activity:read_all",
  });
  if (error) throw error;
  return athleteId;
}

function importActivity(
  userId: string,
  args: { activityId?: number; type?: string; startedAt?: string; minutes?: number; distanceKm?: number } = {},
) {
  return adminClient().rpc("import_strava_activity", {
    p_user_id: userId,
    p_strava_activity_id: args.activityId ?? nextActivityId++,
    p_type: args.type ?? "running",
    p_started_at: args.startedAt ?? minutesAgo(90),
    p_duration_minutes: args.minutes ?? 30,
    p_distance_km: args.distanceKm,
  });
}

describe.skipIf(!dbTestsEnabled)("import_strava_activity", () => {
  it("pays exactly what log_workout pays and marks the workout as from Strava", async () => {
    const p = await newPlayer();
    await connect(p.user.id);
    const activityId = nextActivityId++;

    const { data, error } = await importActivity(p.user.id, { activityId, minutes: 30, distanceKm: 5 });
    expect(error).toBeNull();
    // Same as tests/db/workouts.test.ts: 30 min running = 60 Gold, 30 Materials, 90 XP.
    expect(data).toMatchObject({ status: "imported", gold: 60, materials: 30, xp: 90 });

    const workouts = await p.client.from("workouts").select("*");
    expect(workouts.data).toEqual([
      expect.objectContaining({
        source: "strava",
        strava_activity_id: activityId,
        type: "running",
        duration_minutes: 30,
        distance_km: 5,
        gold_awarded: 60,
      }),
    ]);
    const wallet = await p.client.from("wallets").select("gold, materials").single();
    expect(wallet.data).toEqual({ gold: 60, materials: 30 });
  });

  it("pays each activity only once (webhook retries, repeated syncs)", async () => {
    const p = await newPlayer();
    await connect(p.user.id);
    const activityId = nextActivityId++;

    await importActivity(p.user.id, { activityId });
    const again = await importActivity(p.user.id, { activityId });
    expect(again.data).toEqual({ status: "duplicate" });

    const wallet = await p.client.from("wallets").select("gold").single();
    expect(wallet.data!.gold).toBe(60);
  });

  it("won't pay a second account for an activity already claimed", async () => {
    const [a, b] = await Promise.all([newPlayer(), newPlayer()]);
    await Promise.all([connect(a.user.id), connect(b.user.id)]);
    const activityId = nextActivityId++;

    await importActivity(a.user.id, { activityId });
    const second = await importActivity(b.user.id, { activityId });
    expect(second.data).toEqual({ status: "claimed" });
  });

  it("skips an activity that overlaps a workout the player already logged", async () => {
    const p = await newPlayer();
    await connect(p.user.id);
    await p.client.rpc("log_workout", {
      p_type: "running",
      p_started_at: minutesAgo(100),
      p_duration_minutes: 40,
      p_client_request_id: crypto.randomUUID(),
    });

    // Starts 10 minutes into the manual workout.
    const overlap = await importActivity(p.user.id, { startedAt: minutesAgo(90), minutes: 30 });
    expect(overlap.data).toEqual({ status: "overlap" });

    // Starts after the manual workout ended: fine.
    const later = await importActivity(p.user.id, { startedAt: minutesAgo(50), minutes: 20 });
    expect(later.data).toMatchObject({ status: "imported" });
  });

  it("applies the same validation as log_workout", async () => {
    const p = await newPlayer();
    await connect(p.user.id);

    const old = await importActivity(p.user.id, { startedAt: minutesAgo(8 * 24 * 60) });
    expect(old.error).toMatchObject({ message: "INVALID_INPUT" });

    const unknown = await importActivity(p.user.id, { type: "swimming" });
    expect(unknown.error).toMatchObject({ message: "INVALID_INPUT" });
  });

  it("refuses players who aren't connected", async () => {
    const p = await newPlayer();
    const { error } = await importActivity(p.user.id);
    expect(error).toMatchObject({ message: "NOT_FOUND" });
  });

  it("players can't call it for themselves", async () => {
    const p = await newPlayer();
    await connect(p.user.id);
    const { error } = await p.client.rpc("import_strava_activity", {
      p_user_id: p.user.id,
      p_strava_activity_id: nextActivityId++,
      p_type: "running",
      p_started_at: minutesAgo(60),
      p_duration_minutes: 30,
    });
    expect(error?.code).toBe("42501"); // permission denied
  });
});

describe.skipIf(!dbTestsEnabled)("Strava connections", () => {
  it("a player sees their own connection, but never the tokens", async () => {
    const [p, other] = await Promise.all([newPlayer(), newPlayer()]);
    const athleteId = await connect(p.user.id);
    await connect(other.user.id);

    const mine = await p.client.rpc("get_strava_connection");
    expect(mine.error).toBeNull();
    expect(mine.data).toEqual([
      expect.objectContaining({ athlete_id: athleteId, athlete_name: "Test Athlete", last_synced_at: null }),
    ]);
    expect(JSON.stringify(mine.data)).not.toContain("secret");

    const table = await p.client.from("strava_connections").select("*");
    expect(table.error?.code).toBe("42501"); // permission denied
  });

  it("returns nothing when not connected", async () => {
    const p = await newPlayer();
    const { data } = await p.client.rpc("get_strava_connection");
    expect(data).toEqual([]);
  });

  it("manual workouts are still marked manual", async () => {
    const p = await newPlayer();
    await p.client.rpc("log_workout", {
      p_type: "walking",
      p_started_at: minutesAgo(60),
      p_duration_minutes: 20,
      p_client_request_id: crypto.randomUUID(),
    });
    const { data } = await p.client.from("workouts").select("source, strava_activity_id").single();
    expect(data).toEqual({ source: "manual", strava_activity_id: null });
  });
});
