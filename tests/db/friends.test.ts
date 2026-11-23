import { describe, expect, it } from "vitest";
import { adminClient, anonClient, dbTestsEnabled, newPlayer, setFunds, type Client } from "./helpers";

type Player = Awaited<ReturnType<typeof newPlayer>>;

const request = (client: Client, username: string) =>
  client.rpc("send_friend_request", { p_username: username });

async function requestOk(from: Player, to: Player) {
  const { data, error } = await request(from.client, to.username);
  if (error) throw new Error(`send_friend_request failed: ${error.message} ${error.details ?? ""}`);
  return data as { status: string; friendship_id: string };
}

async function makeFriends(a: Player, b: Player) {
  await requestOk(a, b);
  await requestOk(b, a); // asking back accepts
}

const friendIds = async (p: Player) =>
  ((await p.client.rpc("get_friends")).data ?? []).map((f) => f.id).sort();

describe.skipIf(!dbTestsEnabled)("friend requests", () => {
  it("sends a request the other player can see and accept", async () => {
    const [alice, bob] = await Promise.all([newPlayer(), newPlayer()]);

    expect(await requestOk(alice, bob)).toMatchObject({ status: "pending" });

    const aliceSees = (await alice.client.rpc("get_friend_requests")).data!;
    expect(aliceSees).toEqual([expect.objectContaining({ direction: "outgoing", user_id: bob.user.id })]);

    const bobSees = (await bob.client.rpc("get_friend_requests")).data!;
    expect(bobSees).toEqual([
      expect.objectContaining({ direction: "incoming", user_id: alice.user.id, username: alice.username }),
    ]);

    const accept = await bob.client.rpc("respond_to_friend_request", {
      p_friendship_id: bobSees[0].id,
      p_accept: true,
    });
    expect(accept.data).toEqual({ status: "accepted" });

    expect(await friendIds(alice)).toEqual([bob.user.id]);
    expect(await friendIds(bob)).toEqual([alice.user.id]);
    expect((await bob.client.rpc("get_friend_requests")).data).toEqual([]);
  });

  it("returns friends with their level and Kingdom Score", async () => {
    const [alice, bob] = await Promise.all([newPlayer(), newPlayer()]);
    await makeFriends(alice, bob);
    const { data } = await alice.client.rpc("get_friends");
    expect(data).toEqual([
      { id: bob.user.id, username: bob.username, display_name: bob.username, level: 1, kingdom_score: 15 },
    ]);
  });

  it("accepts automatically when both players ask each other", async () => {
    const [alice, bob] = await Promise.all([newPlayer(), newPlayer()]);
    await requestOk(alice, bob);
    expect(await requestOk(bob, alice)).toMatchObject({ status: "accepted" });
    expect(await friendIds(alice)).toEqual([bob.user.id]);
  });

  it("is harmless to ask twice, and finds usernames in any case", async () => {
    const [alice, bob] = await Promise.all([newPlayer(), newPlayer()]);
    const first = await requestOk(alice, bob);
    const { data } = await request(alice.client, bob.username.toUpperCase());
    expect(data).toEqual({ status: "pending", friendship_id: first.friendship_id });
    expect((await bob.client.rpc("get_friend_requests")).data).toHaveLength(1);
  });

  it("creates one friendship when both ask at the same moment", async () => {
    const [alice, bob] = await Promise.all([newPlayer(), newPlayer()]);
    const results = await Promise.all([request(alice.client, bob.username), request(bob.client, alice.username)]);
    expect(results.every((r) => !r.error)).toBe(true);

    const rows = await adminClient()
      .from("friendships")
      .select("status")
      .or(`requester_id.eq.${alice.user.id},addressee_id.eq.${alice.user.id}`);
    expect(rows.data).toEqual([{ status: "accepted" }]);
  });

  it("declining removes the request and makes no friendship", async () => {
    const [alice, bob] = await Promise.all([newPlayer(), newPlayer()]);
    await requestOk(alice, bob);
    const [incoming] = (await bob.client.rpc("get_friend_requests")).data!;

    const decline = await bob.client.rpc("respond_to_friend_request", {
      p_friendship_id: incoming.id,
      p_accept: false,
    });
    expect(decline.data).toEqual({ status: "declined" });
    expect(await friendIds(alice)).toEqual([]);
    expect((await alice.client.rpc("get_friend_requests")).data).toEqual([]);
  });

  it("only the invited player can accept", async () => {
    const [alice, bob] = await Promise.all([newPlayer(), newPlayer()]);
    const { friendship_id } = await requestOk(alice, bob);

    const { error } = await alice.client.rpc("respond_to_friend_request", {
      p_friendship_id: friendship_id,
      p_accept: true,
    });
    expect(error?.message).toBe("NOT_FOUND");
    expect(await friendIds(alice)).toEqual([]);
  });

  it("rejects unknown usernames and yourself", async () => {
    const alice = await newPlayer();
    expect((await request(alice.client, "nobody_has_this_name")).error?.message).toBe("NOT_FOUND");
    expect((await request(alice.client, alice.username)).error?.message).toBe("INVALID_INPUT");
  });

  it("remove_friend unfriends both sides and can cancel a pending request", async () => {
    const [alice, bob, carol] = await Promise.all([newPlayer(), newPlayer(), newPlayer()]);
    await makeFriends(alice, bob);
    await requestOk(alice, carol);

    await bob.client.rpc("remove_friend", { p_user_id: alice.user.id });
    await alice.client.rpc("remove_friend", { p_user_id: carol.user.id });

    expect(await friendIds(alice)).toEqual([]);
    expect(await friendIds(bob)).toEqual([]);
    expect((await carol.client.rpc("get_friend_requests")).data).toEqual([]);
    // Doing it again is harmless.
    expect((await bob.client.rpc("remove_friend", { p_user_id: alice.user.id })).error).toBeNull();
  });

  it("players can't write friendships directly", async () => {
    const [alice, bob] = await Promise.all([newPlayer(), newPlayer()]);
    const { error } = await alice.client
      .from("friendships")
      .insert({ requester_id: alice.user.id, addressee_id: bob.user.id, status: "accepted" });
    expect(error).not.toBeNull();
  });

  it("signed-out visitors can't use any of it", async () => {
    const anon = anonClient();
    expect((await anon.rpc("send_friend_request", { p_username: "x" })).error).not.toBeNull();
    expect((await anon.rpc("get_friends")).error).not.toBeNull();
    expect((await anon.rpc("get_weekly_leaderboard")).error).not.toBeNull();
  });
});

describe.skipIf(!dbTestsEnabled)("visiting a friend's kingdom", () => {
  it("friends can see each other's kingdom, buildings and character", async () => {
    const [alice, bob] = await Promise.all([newPlayer(), newPlayer()]);
    await makeFriends(alice, bob);

    const kingdom = await alice.client.from("kingdoms").select("kingdom_score").eq("user_id", bob.user.id);
    expect(kingdom.data).toEqual([{ kingdom_score: 15 }]);

    const buildings = await alice.client.from("owned_buildings").select("type").eq("user_id", bob.user.id);
    expect(buildings.data).toEqual([{ type: "town_hall" }]);

    const character = await alice.client.from("characters").select("outfit").eq("user_id", bob.user.id);
    expect(character.data).toEqual([{ outfit: "starter" }]);
  });

  it("friends still can't see wallets, workouts or transactions", async () => {
    const [alice, bob] = await Promise.all([newPlayer(), newPlayer()]);
    await makeFriends(alice, bob);
    await bob.client.rpc("log_workout", {
      p_type: "running",
      p_started_at: new Date(Date.now() - 3_600_000).toISOString(),
      p_duration_minutes: 30,
      p_client_request_id: crypto.randomUUID(),
    });

    for (const table of ["wallets", "workouts", "resource_transactions", "kingdom_score_events"] as const) {
      const { data } = await alice.client.from(table).select("*").eq("user_id", bob.user.id);
      expect(data, table).toEqual([]);
    }
  });

  it("friends can't change each other's buildings", async () => {
    const [alice, bob] = await Promise.all([newPlayer(), newPlayer()]);
    await makeFriends(alice, bob);
    await setFunds(alice.user.id, 5000, 5000);
    const [hall] = (await alice.client.from("owned_buildings").select("id").eq("user_id", bob.user.id)).data!;

    expect((await alice.client.rpc("upgrade_building", { p_building_id: hall.id })).error?.message).toBe("NOT_FOUND");
    expect((await alice.client.from("owned_buildings").update({ level: 3 }).eq("id", hall.id)).error).not.toBeNull();
  });

  it("strangers, pending requests and ex-friends can't see the kingdom", async () => {
    const [alice, bob, carol, dave] = await Promise.all([newPlayer(), newPlayer(), newPlayer(), newPlayer()]);
    await requestOk(carol, alice); // pending only
    await makeFriends(dave, alice);
    await dave.client.rpc("remove_friend", { p_user_id: alice.user.id });

    for (const viewer of [bob, carol, dave]) {
      const { data } = await viewer.client.from("owned_buildings").select("id").eq("user_id", alice.user.id);
      expect(data).toEqual([]);
    }
  });
});

describe.skipIf(!dbTestsEnabled)("weekly leaderboard", () => {
  it("ranks me and my friends by Kingdom Score gained this week, then weekly XP", async () => {
    const [me, rich, xpOnly, stranger] = await Promise.all([newPlayer(), newPlayer(), newPlayer(), newPlayer()]);
    await Promise.all([makeFriends(me, rich), makeFriends(me, xpOnly)]);

    // rich: buys a workshop (+8) and a house (+5) this week.
    await setFunds(rich.user.id, 1000, 1000);
    await rich.client.rpc("purchase_building", { p_type: "workshop", p_x: 0, p_y: 0 });
    await rich.client.rpc("purchase_building", { p_type: "house", p_x: 1, p_y: 0 });

    // me: buys a house (+5) and logs a 30 min run (90 XP).
    await setFunds(me.user.id, 1000, 1000);
    await me.client.rpc("purchase_building", { p_type: "house", p_x: 0, p_y: 0 });
    await me.client.rpc("log_workout", {
      p_type: "running",
      p_started_at: new Date(Date.now() - 3_600_000).toISOString(),
      p_duration_minutes: 30,
      p_client_request_id: crypto.randomUUID(),
    });

    // xpOnly: only a 10 min walk (20 XP), no buildings.
    await xpOnly.client.rpc("log_workout", {
      p_type: "walking",
      p_started_at: new Date(Date.now() - 3_600_000).toISOString(),
      p_duration_minutes: 10,
      p_client_request_id: crypto.randomUUID(),
    });

    // stranger: lots of activity, but not my friend.
    await setFunds(stranger.user.id, 1000, 1000);
    await stranger.client.rpc("purchase_building", { p_type: "workshop", p_x: 0, p_y: 0 });

    const { data, error } = await me.client.rpc("get_weekly_leaderboard");
    expect(error).toBeNull();
    expect(data).toEqual([
      { rank: 1, user_id: rich.user.id, display_name: rich.username, weekly_kingdom_score: 13, weekly_xp: 0, is_current_user: false },
      { rank: 2, user_id: me.user.id, display_name: me.username, weekly_kingdom_score: 5, weekly_xp: 90, is_current_user: true },
      { rank: 3, user_id: xpOnly.user.id, display_name: xpOnly.username, weekly_kingdom_score: 0, weekly_xp: 20, is_current_user: false },
    ]);
  });

  it("shows just me when I have no friends, without the starting Town Hall", async () => {
    const me = await newPlayer();
    const { data } = await me.client.rpc("get_weekly_leaderboard");
    expect(data).toEqual([
      { rank: 1, user_id: me.user.id, display_name: me.username, weekly_kingdom_score: 0, weekly_xp: 0, is_current_user: true },
    ]);
  });

  it("only counts this week", async () => {
    const me = await newPlayer();
    await setFunds(me.user.id, 1000, 1000);
    await me.client.rpc("purchase_building", { p_type: "house", p_x: 0, p_y: 0 });

    // Move that score event to last week.
    const lastWeek = new Date(Date.now() - 8 * 24 * 3_600_000).toISOString();
    await adminClient().from("kingdom_score_events").update({ created_at: lastWeek }).eq("user_id", me.user.id);

    const { data } = await me.client.rpc("get_weekly_leaderboard");
    expect(data![0].weekly_kingdom_score).toBe(0);
  });
});
