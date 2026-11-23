import { describe, expect, it } from "vitest";
import { anonClient, dbTestsEnabled, newPlayer, setFunds, type Client } from "./helpers";

type Player = Awaited<ReturnType<typeof newPlayer>>;

const buy = (client: Client, type: string, x: number, y: number) =>
  client.rpc("purchase_building", { p_type: type, p_x: x, p_y: y });

const upgrade = (client: Client, buildingId: string) =>
  client.rpc("upgrade_building", { p_building_id: buildingId });

async function buyOk(client: Client, type: string, x: number, y: number): Promise<string> {
  const { data, error } = await buy(client, type, x, y);
  if (error) throw new Error(`purchase_building failed: ${error.message} ${error.details ?? ""}`);
  return (data as { building_id: string }).building_id;
}

async function snapshot(p: Player) {
  const [wallet, kingdom, buildings] = await Promise.all([
    p.client.from("wallets").select("gold, materials").single(),
    p.client.from("kingdoms").select("kingdom_score").single(),
    p.client.from("owned_buildings").select("id, type, level, x, y").order("created_at"),
  ]);
  return {
    gold: wallet.data!.gold,
    materials: wallet.data!.materials,
    score: kingdom.data!.kingdom_score,
    buildings: buildings.data!,
  };
}

describe.skipIf(!dbTestsEnabled)("buying buildings", () => {
  it("starts with a Town Hall worth 15 points", async () => {
    const p = await newPlayer();
    const s = await snapshot(p);
    expect(s.score).toBe(15);
    expect(s.buildings).toEqual([expect.objectContaining({ type: "town_hall", level: 1, x: 2, y: 2 })]);
  });

  it("buys a House with Gold earned from a workout", async () => {
    const p = await newPlayer();
    // 120 min running = 240 Gold, 120 Materials.
    await p.client.rpc("log_workout", {
      p_type: "running",
      p_started_at: new Date(Date.now() - 3_600_000).toISOString(),
      p_duration_minutes: 120,
      p_client_request_id: crypto.randomUUID(),
    });

    const id = await buyOk(p.client, "house", 0, 0);
    const s = await snapshot(p);

    expect(s.gold).toBe(240 - 100);
    expect(s.materials).toBe(120 - 10);
    expect(s.score).toBe(15 + 5);
    expect(s.buildings).toContainEqual({ id, type: "house", level: 1, x: 0, y: 0 });

    const tx = await p.client.from("resource_transactions").select("*").eq("owned_building_id", id);
    expect(tx.data).toEqual([
      expect.objectContaining({ reason: "purchase", gold_delta: -100, materials_delta: -10, xp_delta: 0 }),
    ]);

    const events = await p.client.from("kingdom_score_events").select("delta, reason");
    expect(events.data).toEqual([{ delta: 5, reason: "purchase" }]);
  });

  it("refuses when the player can't afford it, and charges nothing", async () => {
    const p = await newPlayer(); // 0 Gold
    const { error } = await buy(p.client, "house", 0, 0);
    expect(error?.message).toBe("INSUFFICIENT_FUNDS");
    expect(error?.details).toEqual(expect.any(String));

    const s = await snapshot(p);
    expect(s).toMatchObject({ gold: 0, materials: 0, score: 15 });
    expect(s.buildings).toHaveLength(1);
  });

  it("needs enough Materials as well as Gold", async () => {
    const p = await newPlayer();
    await setFunds(p.user.id, 1000, 5); // house needs 10 Materials
    const { error } = await buy(p.client, "house", 0, 0);
    expect(error?.message).toBe("INSUFFICIENT_FUNDS");
  });

  it("refuses an occupied plot, including the Town Hall's", async () => {
    const p = await newPlayer();
    await setFunds(p.user.id, 1000, 1000);
    await buyOk(p.client, "house", 0, 0);

    expect((await buy(p.client, "farm", 0, 0)).error?.message).toBe("PLOT_OCCUPIED");
    expect((await buy(p.client, "farm", 2, 2)).error?.message).toBe("PLOT_OCCUPIED");
    expect((await snapshot(p)).gold).toBe(900);
  });

  it.each([
    ["x too large", "house", 5, 0],
    ["y too large", "house", 0, 5],
    ["negative x", "house", -1, 0],
    ["unknown type", "castle", 0, 0],
    ["a second Town Hall", "town_hall", 0, 0],
  ])("refuses %s with INVALID_INPUT and charges nothing", async (_, type, x, y) => {
    const p = await newPlayer();
    await setFunds(p.user.id, 1000, 1000);
    const { error } = await buy(p.client, type as string, x as number, y as number);
    expect(error?.message).toBe("INVALID_INPUT");
    expect(await snapshot(p)).toMatchObject({ gold: 1000, materials: 1000, score: 15 });
  });
});

describe.skipIf(!dbTestsEnabled)("upgrading buildings", () => {
  it("upgrades level by level, then stops at max level", async () => {
    const p = await newPlayer();
    await setFunds(p.user.id, 1000, 1000);
    const id = await buyOk(p.client, "house", 1, 1); // -100 / -10, +5

    expect((await upgrade(p.client, id)).error).toBeNull(); // -150 / -25, +5
    expect((await upgrade(p.client, id)).error).toBeNull(); // -250 / -50, +8

    const s = await snapshot(p);
    expect(s.buildings).toContainEqual({ id, type: "house", level: 3, x: 1, y: 1 });
    expect(s.gold).toBe(1000 - 100 - 150 - 250);
    expect(s.materials).toBe(1000 - 10 - 25 - 50);
    expect(s.score).toBe(15 + 18);

    const max = await upgrade(p.client, id);
    expect(max.error?.message).toBe("MAX_LEVEL");
    expect((await snapshot(p)).gold).toBe(500);

    const events = await p.client.from("kingdom_score_events").select("delta, reason").order("id");
    expect(events.data).toEqual([
      { delta: 5, reason: "purchase" },
      { delta: 5, reason: "upgrade" },
      { delta: 8, reason: "upgrade" },
    ]);
  });

  it("can upgrade the starting Town Hall", async () => {
    const p = await newPlayer();
    await setFunds(p.user.id, 300, 60);
    const hall = (await snapshot(p)).buildings[0];

    expect((await upgrade(p.client, hall.id)).error).toBeNull();
    expect(await snapshot(p)).toMatchObject({ gold: 0, materials: 0, score: 35 });
  });

  it("refuses when the player can't afford the upgrade", async () => {
    const p = await newPlayer();
    await setFunds(p.user.id, 100, 10);
    const id = await buyOk(p.client, "house", 0, 0); // now 0 / 0

    const { error } = await upgrade(p.client, id);
    expect(error?.message).toBe("INSUFFICIENT_FUNDS");
    expect((await snapshot(p)).buildings).toContainEqual(expect.objectContaining({ id, level: 1 }));
  });
});

describe.skipIf(!dbTestsEnabled)("players can't touch other kingdoms", () => {
  it("can't upgrade someone else's building (looks not found, nobody is charged)", async () => {
    const [alice, bob] = await Promise.all([newPlayer(), newPlayer()]);
    await Promise.all([setFunds(alice.user.id, 1000, 1000), setFunds(bob.user.id, 1000, 1000)]);
    const bobsHouse = await buyOk(bob.client, "house", 0, 0);

    const { error } = await upgrade(alice.client, bobsHouse);
    expect(error?.message).toBe("NOT_FOUND");

    expect((await snapshot(alice)).gold).toBe(1000);
    const bobAfter = await snapshot(bob);
    expect(bobAfter.gold).toBe(900);
    expect(bobAfter.buildings).toContainEqual(expect.objectContaining({ id: bobsHouse, level: 1 }));
  });

  it("can't edit buildings, kingdoms or score history directly", async () => {
    const p = await newPlayer();
    const hall = (await snapshot(p)).buildings[0];

    expect((await p.client.from("owned_buildings").update({ level: 3 }).eq("id", hall.id)).error).not.toBeNull();
    expect((await p.client.from("kingdoms").update({ kingdom_score: 9999 }).eq("user_id", p.user.id)).error).not.toBeNull();
    expect(
      (await p.client.from("kingdom_score_events").insert({ user_id: p.user.id, delta: 9999, reason: "purchase" })).error,
    ).not.toBeNull();

    expect(await snapshot(p)).toMatchObject({ score: 15 });
  });

  it("signed-out visitors can't buy or upgrade", async () => {
    expect((await buy(anonClient(), "house", 0, 0)).error).not.toBeNull();
    expect((await upgrade(anonClient(), crypto.randomUUID())).error).not.toBeNull();
  });
});

describe.skipIf(!dbTestsEnabled)("simultaneous requests never overspend", () => {
  it("only buys what the player can afford when purchases arrive at once", async () => {
    const p = await newPlayer();
    await setFunds(p.user.id, 400, 1000); // a workshop costs 180: room for 2

    const results = await Promise.all(
      [
        [0, 0],
        [1, 0],
        [3, 0],
        [4, 0],
      ].map(([x, y]) => buy(p.client, "workshop", x, y)),
    );

    expect(results.filter((r) => !r.error)).toHaveLength(2);
    expect(results.filter((r) => r.error?.message === "INSUFFICIENT_FUNDS")).toHaveLength(2);
    expect(await snapshot(p)).toMatchObject({ gold: 40, score: 15 + 8 + 8 });
  });

  it("gives a plot to only one of several simultaneous purchases", async () => {
    const p = await newPlayer();
    await setFunds(p.user.id, 1000, 1000);

    const results = await Promise.all([1, 2, 3].map(() => buy(p.client, "house", 4, 4)));

    expect(results.filter((r) => !r.error)).toHaveLength(1);
    expect(results.filter((r) => r.error?.message === "PLOT_OCCUPIED")).toHaveLength(2);
    expect((await snapshot(p)).gold).toBe(900);
  });

  it("never upgrades past max level when upgrades arrive at once", async () => {
    const p = await newPlayer();
    await setFunds(p.user.id, 1000, 1000);
    const id = await buyOk(p.client, "house", 0, 0);

    const results = await Promise.all([1, 2, 3].map(() => upgrade(p.client, id)));

    expect(results.filter((r) => !r.error)).toHaveLength(2);
    expect(results.filter((r) => r.error?.message === "MAX_LEVEL")).toHaveLength(1);
    expect(await snapshot(p)).toMatchObject({ gold: 1000 - 100 - 150 - 250, score: 15 + 18 });
  });
});

describe.skipIf(!dbTestsEnabled)("kingdom score stays consistent", () => {
  it("equals the sum of every building's score after many changes", async () => {
    const p = await newPlayer();
    await setFunds(p.user.id, 5000, 5000);

    const house = await buyOk(p.client, "house", 0, 0);
    const farm = await buyOk(p.client, "farm", 1, 0);
    await buyOk(p.client, "workshop", 0, 1);
    await upgrade(p.client, house);
    await upgrade(p.client, farm);
    await upgrade(p.client, farm);

    const [s, defs, events] = await Promise.all([
      snapshot(p),
      p.client.from("building_definitions").select("type, score_by_level"),
      p.client.from("kingdom_score_events").select("delta"),
    ]);
    const scoreOf = (type: string, level: number) =>
      defs.data!.find((d) => d.type === type)!.score_by_level[level - 1];

    const expected = s.buildings.reduce((sum, b) => sum + scoreOf(b.type, b.level), 0);
    expect(s.score).toBe(expected);
    // Every change after the starting Town Hall is in the score history.
    expect(events.data!.reduce((sum, e) => sum + e.delta, 0)).toBe(expected - 15);
  });
});
