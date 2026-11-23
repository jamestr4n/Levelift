import { describe, expect, it } from "vitest";
import { calculateRewards } from "@/lib/rewards/calculate";
import { applyXp } from "@/lib/rewards/levels";
import type { Rewards, WorkoutType } from "@/types/game";
import { anonClient, dbTestsEnabled, newPlayer, type Client } from "./helpers";

interface LogResult {
  workout_id: string;
  gold: number;
  materials: number;
  xp: number;
  daily_limit_reached: boolean;
  leveled_up: boolean;
  duplicate: boolean;
}

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

function log(
  client: Client,
  args: {
    type?: WorkoutType | string;
    minutes?: number;
    startedAt?: string;
    distanceKm?: number;
    sets?: number;
    requestId?: string;
  } = {},
) {
  return client.rpc("log_workout", {
    p_type: args.type ?? "running",
    p_started_at: args.startedAt ?? minutesAgo(60),
    p_duration_minutes: args.minutes ?? 30,
    p_client_request_id: args.requestId ?? crypto.randomUUID(),
    p_distance_km: args.distanceKm,
    p_sets: args.sets,
  });
}

async function logOk(client: Client, args: Parameters<typeof log>[1] = {}): Promise<LogResult> {
  const { data, error } = await log(client, args);
  if (error) throw new Error(`log_workout failed: ${error.message} ${error.details ?? ""}`);
  return data as unknown as LogResult;
}

async function state(client: Client, userId: string) {
  const [profile, wallet] = await Promise.all([
    client.from("profiles").select("level, xp").eq("id", userId).single(),
    client.from("wallets").select("gold, materials").single(),
  ]);
  return { ...profile.data!, ...wallet.data! };
}

describe.skipIf(!dbTestsEnabled)("log_workout awards rewards", () => {
  it("pays Gold, Materials and XP and records everything", async () => {
    const p = await newPlayer();
    const result = await logOk(p.client, { type: "running", minutes: 30, distanceKm: 5 });

    expect(result).toMatchObject({ gold: 60, materials: 30, xp: 90, duplicate: false, daily_limit_reached: false });
    expect(await state(p.client, p.user.id)).toEqual({ level: 1, xp: 90, gold: 60, materials: 30 });

    const workout = await p.client.from("workouts").select("*").eq("id", result.workout_id).single();
    expect(workout.data).toMatchObject({
      type: "running",
      duration_minutes: 30,
      distance_km: 5,
      gold_awarded: 60,
      materials_awarded: 30,
      xp_awarded: 90,
    });

    const tx = await p.client.from("resource_transactions").select("*").eq("workout_id", result.workout_id);
    expect(tx.data).toEqual([
      expect.objectContaining({ reason: "workout", gold_delta: 60, materials_delta: 30, xp_delta: 90 }),
    ]);
  });

  it("matches the TypeScript mirror (config.ts / levels.ts) including daily caps", async () => {
    const p = await newPlayer();
    const plan: Array<[WorkoutType, number]> = [
      ["walking", 30],
      ["running", 45],
      ["cycling", 200], // over the per-workout minute cap
      ["strength", 60],
      ["running", 120], // hits the daily caps
      ["walking", 10], // nothing left today
    ];

    const earned: Rewards = { gold: 0, materials: 0, xp: 0 };
    let expectedLevel = { level: 1, xp: 0 };

    for (const [type, minutes] of plan) {
      const result = await logOk(p.client, { type, minutes });
      const expected = calculateRewards(type, minutes, earned);

      expect({ gold: result.gold, materials: result.materials, xp: result.xp }).toEqual(expected.rewards);
      expect(result.daily_limit_reached).toBe(expected.dailyLimitReached);

      earned.gold += expected.rewards.gold;
      earned.materials += expected.rewards.materials;
      earned.xp += expected.rewards.xp;

      const next = applyXp(expectedLevel.level, expectedLevel.xp, expected.rewards.xp);
      expect(result.leveled_up).toBe(next.leveledUp);
      expectedLevel = { level: next.level, xp: next.xp };
    }

    const final = await state(p.client, p.user.id);
    expect(final).toEqual({ ...expectedLevel, gold: earned.gold, materials: earned.materials });
    // The daily caps were reached.
    expect(earned).toEqual({ gold: 400, materials: 200, xp: 600 });
  });

  it("levels up when enough XP is earned", async () => {
    const p = await newPlayer();
    // 120 min running = 360 XP: level 1 (needs 100) -> level 2 (needs 200) -> level 3 with 60 left.
    const result = await logOk(p.client, { type: "running", minutes: 120 });
    expect(result.leveled_up).toBe(true);
    expect(await state(p.client, p.user.id)).toMatchObject({ level: 3, xp: 60 });
  });

  it("stores sets for strength training", async () => {
    const p = await newPlayer();
    const result = await logOk(p.client, { type: "strength", minutes: 40, sets: 12 });
    const workout = await p.client.from("workouts").select("sets, distance_km").eq("id", result.workout_id).single();
    expect(workout.data).toEqual({ sets: 12, distance_km: null });
  });
});

describe.skipIf(!dbTestsEnabled)("log_workout never pays twice", () => {
  it("returns the original result when the same request is retried", async () => {
    const p = await newPlayer();
    const requestId = crypto.randomUUID();

    const first = await logOk(p.client, { minutes: 30, requestId });
    const retry = await logOk(p.client, { minutes: 30, requestId });

    expect(retry).toEqual({ ...first, leveled_up: false, duplicate: true });
    expect(await state(p.client, p.user.id)).toMatchObject({ gold: 60, xp: 90 });

    const workouts = await p.client.from("workouts").select("id");
    expect(workouts.data).toHaveLength(1);
  });

  it("pays once when the same request arrives several times at once", async () => {
    const p = await newPlayer();
    const requestId = crypto.randomUUID();

    const results = await Promise.all([1, 2, 3, 4].map(() => logOk(p.client, { minutes: 30, requestId })));

    expect(results.filter((r) => !r.duplicate)).toHaveLength(1);
    expect(await state(p.client, p.user.id)).toMatchObject({ gold: 60, materials: 30, xp: 90 });

    const tx = await p.client.from("resource_transactions").select("id");
    expect(tx.data).toHaveLength(1);
  });

  it("lets two players use the same request id independently", async () => {
    const [a, b] = await Promise.all([newPlayer(), newPlayer()]);
    const requestId = crypto.randomUUID();
    expect((await logOk(a.client, { requestId })).duplicate).toBe(false);
    expect((await logOk(b.client, { requestId })).duplicate).toBe(false);
  });
});

describe.skipIf(!dbTestsEnabled)("log_workout rejects bad input", () => {
  it.each([
    ["unknown type", { type: "swimming" }],
    ["zero minutes", { minutes: 0 }],
    ["over 600 minutes", { minutes: 601 }],
    ["start in the future", { startedAt: minutesAgo(-60) }],
    ["start over 7 days ago", { startedAt: minutesAgo(8 * 24 * 60) }],
    ["distance on strength", { type: "strength", distanceKm: 3 }],
    ["sets on a run", { type: "running", sets: 5 }],
    ["negative distance", { distanceKm: -2 }],
  ])("%s -> INVALID_INPUT with a friendly message", async (_, args) => {
    const p = await newPlayer();
    const { error } = await log(p.client, args);
    expect(error?.message).toBe("INVALID_INPUT");
    expect(error?.details).toEqual(expect.any(String));

    // Nothing was paid out.
    expect(await state(p.client, p.user.id)).toMatchObject({ gold: 0, materials: 0, xp: 0 });
  });

  it("cannot be called by a signed-out visitor", async () => {
    const { error } = await log(anonClient());
    expect(error).not.toBeNull();
  });
});
