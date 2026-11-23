import { beforeAll, describe, expect, it } from "vitest";
import {
  anonClient,
  dbTestsEnabled,
  newPlayer,
  randomUsername,
  TEST_PASSWORD,
} from "./helpers";

type Player = Awaited<ReturnType<typeof newPlayer>>;

describe.skipIf(!dbTestsEnabled)("sign-up creates a complete player", () => {
  let alice: Player;

  beforeAll(async () => {
    alice = await newPlayer();
  });

  it("creates a profile with the chosen username at level 1", async () => {
    const { data, error } = await alice.client
      .from("profiles")
      .select("*")
      .eq("id", alice.user.id)
      .single();
    expect(error).toBeNull();
    expect(data).toMatchObject({ username: alice.username, level: 1, xp: 0 });
  });

  it("creates a character, an empty wallet and a kingdom", async () => {
    const character = await alice.client.from("characters").select("*").single();
    expect(character.data).toMatchObject({ outfit: "starter", unlocked_outfits: ["starter"] });

    const wallet = await alice.client.from("wallets").select("*").single();
    expect(wallet.data).toMatchObject({ gold: 0, materials: 0 });

    const kingdom = await alice.client.from("kingdoms").select("*").single();
    expect(kingdom.data).toMatchObject({ grid_width: 5, grid_height: 5, kingdom_score: 15 });
  });

  it("starts the kingdom with a level-1 Town Hall in the middle", async () => {
    const { data } = await alice.client.from("owned_buildings").select("type, level, x, y");
    expect(data).toEqual([{ type: "town_hall", level: 1, x: 2, y: 2 }]);
  });

  it("stores usernames in lowercase", async () => {
    const base = randomUsername("caps");
    const player = await newPlayer(base.toUpperCase());
    const { data } = await player.client.from("profiles").select("username").eq("id", player.user.id).single();
    expect(data?.username).toBe(base);
  });
});

describe.skipIf(!dbTestsEnabled)("invalid sign-ups are rejected", () => {
  it("rejects an invalid username", async () => {
    const { error } = await anonClient().auth.signUp({
      email: `${randomUsername()}@example.test`,
      password: TEST_PASSWORD,
      options: { data: { username: "no spaces!" } },
    });
    expect(error).not.toBeNull();
  });

  it("rejects a missing username", async () => {
    const { error } = await anonClient().auth.signUp({
      email: `${randomUsername()}@example.test`,
      password: TEST_PASSWORD,
    });
    expect(error).not.toBeNull();
  });

  it("rejects a username that is already taken", async () => {
    const first = await newPlayer();
    const { error } = await anonClient().auth.signUp({
      email: `${randomUsername()}@example.test`,
      password: TEST_PASSWORD,
      options: { data: { username: first.username } },
    });
    expect(error).not.toBeNull();
  });
});

describe.skipIf(!dbTestsEnabled)("players cannot see or change other players' data", () => {
  let alice: Player;
  let bob: Player;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([newPlayer(), newPlayer()]);
  });

  it.each(["wallets", "kingdoms", "characters", "owned_buildings", "workouts", "resource_transactions"] as const)(
    "cannot read another player's %s",
    async (table) => {
      const { data, error } = await alice.client.from(table).select("*").eq("user_id", bob.user.id);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    },
  );

  it("can see other players' public profiles (for adding friends)", async () => {
    const { data } = await alice.client.from("profiles").select("username").eq("id", bob.user.id).single();
    expect(data?.username).toBe(bob.username);
  });

  it("cannot change their own XP or level", async () => {
    const xp = await alice.client.from("profiles").update({ xp: 999_999 }).eq("id", alice.user.id);
    expect(xp.error).not.toBeNull();

    const level = await alice.client.from("profiles").update({ level: 99 }).eq("id", alice.user.id);
    expect(level.error).not.toBeNull();
  });

  it("cannot give themselves Gold or Materials", async () => {
    const { error } = await alice.client.from("wallets").update({ gold: 999_999 }).eq("user_id", alice.user.id);
    expect(error).not.toBeNull();

    const wallet = await alice.client.from("wallets").select("gold").single();
    expect(wallet.data?.gold).toBe(0);
  });

  it("cannot add buildings or workouts directly", async () => {
    const building = await alice.client
      .from("owned_buildings")
      .insert({ user_id: alice.user.id, type: "house", x: 0, y: 0 });
    expect(building.error).not.toBeNull();

    const workout = await alice.client.from("workouts").insert({
      user_id: alice.user.id,
      type: "running",
      started_at: new Date().toISOString(),
      duration_minutes: 30,
      gold_awarded: 999_999,
      client_request_id: crypto.randomUUID(),
    });
    expect(workout.error).not.toBeNull();
  });

  it("can change their own display name", async () => {
    const { error } = await alice.client
      .from("profiles")
      .update({ display_name: "Alice the Bold" })
      .eq("id", alice.user.id);
    expect(error).toBeNull();

    const { data } = await alice.client.from("profiles").select("display_name").eq("id", alice.user.id).single();
    expect(data?.display_name).toBe("Alice the Bold");
  });

  it("cannot change another player's display name", async () => {
    await alice.client.from("profiles").update({ display_name: "Hacked" }).eq("id", bob.user.id);
    const { data } = await bob.client.from("profiles").select("display_name").eq("id", bob.user.id).single();
    expect(data?.display_name).not.toBe("Hacked");
  });
});

describe.skipIf(!dbTestsEnabled)("signed-out visitors", () => {
  it("cannot read profiles or wallets", async () => {
    const anon = anonClient();
    const profiles = await anon.from("profiles").select("*");
    expect(profiles.data ?? []).toEqual([]);
    const wallets = await anon.from("wallets").select("*");
    expect(wallets.data ?? []).toEqual([]);
  });

  it("can read building definitions", async () => {
    const { data } = await anonClient().from("building_definitions").select("type").order("type");
    expect(data?.map((d) => d.type)).toEqual(["farm", "house", "town_hall", "workshop"]);
  });
});

describe.skipIf(!dbTestsEnabled)("is_username_available", () => {
  it("is true for a free, valid username", async () => {
    const { data } = await anonClient().rpc("is_username_available", { name: randomUsername("free") });
    expect(data).toBe(true);
  });

  it("is false for a taken username, in any case", async () => {
    const taken = await newPlayer();
    const { data } = await anonClient().rpc("is_username_available", { name: taken.username.toUpperCase() });
    expect(data).toBe(false);
  });

  it("is false for an invalid username", async () => {
    const { data } = await anonClient().rpc("is_username_available", { name: "a" });
    expect(data).toBe(false);
  });
});
