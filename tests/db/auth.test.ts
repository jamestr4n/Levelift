import { beforeAll, describe, expect, it } from "vitest";
import { mapAuthError } from "@/lib/auth/errors";
import { toCharacterState, toPlayerProfile } from "@/services/mappers";
import { anonClient, dbTestsEnabled, newPlayer, randomUsername, TEST_PASSWORD } from "./helpers";

type Player = Awaited<ReturnType<typeof newPlayer>>;

describe.skipIf(!dbTestsEnabled)("auth against local Supabase", () => {
  let hero: Player;

  beforeAll(async () => {
    hero = await newPlayer();
  });

  it("can sign back in with the same email and password", async () => {
    const client = anonClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: hero.email,
      password: TEST_PASSWORD,
    });
    expect(error).toBeNull();
    expect(data.user?.id).toBe(hero.user.id);
  });

  it("maps a wrong password to INVALID_CREDENTIALS", async () => {
    const { error } = await anonClient().auth.signInWithPassword({
      email: hero.email,
      password: "wrong-password",
    });
    expect(error).not.toBeNull();
    expect(mapAuthError(error!)).toMatchObject({ ok: false, code: "INVALID_CREDENTIALS" });
  });

  it("maps a reused email to EMAIL_TAKEN", async () => {
    const { error } = await anonClient().auth.signUp({
      email: hero.email,
      password: TEST_PASSWORD,
      options: { data: { username: randomUsername() } },
    });
    expect(error).not.toBeNull();
    expect(mapAuthError(error!)).toMatchObject({ ok: false, code: "EMAIL_TAKEN" });
  });

  it("builds a PlayerProfile from the player's own rows (what getCurrentPlayer does)", async () => {
    const id = hero.user.id;
    const [profile, wallet, kingdom] = await Promise.all([
      hero.client.from("profiles").select("*").eq("id", id).single(),
      hero.client.from("wallets").select("gold, materials").eq("user_id", id).single(),
      hero.client.from("kingdoms").select("kingdom_score").eq("user_id", id).single(),
    ]);

    expect(toPlayerProfile(profile.data!, wallet.data!, kingdom.data!)).toEqual({
      id,
      username: hero.username,
      displayName: hero.username,
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      gold: 0,
      materials: 0,
      kingdomScore: 15,
    });
  });

  it("builds a CharacterState (what getCharacter does)", async () => {
    const { data } = await hero.client.from("characters").select("*").single();
    expect(toCharacterState(data!)).toEqual({
      userId: hero.user.id,
      outfit: "starter",
      unlockedOutfits: ["starter"],
    });
  });
});
