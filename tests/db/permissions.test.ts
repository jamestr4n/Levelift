/**
 * Permission sweep over EVERY table and database function the API exposes.
 *
 * Tables and functions are discovered from the API itself, so anything added
 * later is checked automatically. If you add one, this test fails until you
 * add it to the lists below, which forces a decision about who may use it.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { anonClient, dbTestsEnabled, newPlayer } from "./helpers";

/** Every table, and who can read it. Nobody can write any table directly. */
const TABLES: Record<string, "public" | "signed-in" | "own-rows"> = {
  building_definitions: "public",
  profiles: "signed-in",
  characters: "own-rows",
  wallets: "own-rows",
  kingdoms: "own-rows",
  owned_buildings: "own-rows",
  workouts: "own-rows",
  resource_transactions: "own-rows",
  friendships: "own-rows",
  kingdom_score_events: "own-rows",
};

/** Every database function, and who can call it. */
const FUNCTIONS: Record<string, "anyone" | "signed-in"> = {
  is_username_available: "anyone",
  is_friend: "signed-in",
  log_workout: "signed-in",
  purchase_building: "signed-in",
  upgrade_building: "signed-in",
  send_friend_request: "signed-in",
  respond_to_friend_request: "signed-in",
  remove_friend: "signed-in",
  get_friends: "signed-in",
  get_friend_requests: "signed-in",
  get_weekly_leaderboard: "signed-in",
};

const NO_ROW = "00000000-0000-0000-0000-000000000000";

interface OpenApiParam {
  in: string;
  schema?: { properties?: Record<string, { format?: string; type?: string }> };
}

interface OpenApi {
  paths: Record<string, { post?: { parameters?: OpenApiParam[] } }>;
  definitions: Record<string, { properties: Record<string, unknown> }>;
}

/** Dummy arguments of the right types, so calls reach the permission check. */
function dummyArgs(spec: OpenApi, fn: string): Record<string, unknown> {
  const body = spec.paths[`/rpc/${fn}`]?.post?.parameters?.find((p) => p.in === "body");
  const props = body?.schema?.properties ?? {};
  return Object.fromEntries(
    Object.entries(props).map(([name, { format = "", type = "" }]) => {
      if (format === "uuid") return [name, NO_ROW];
      if (format.startsWith("timestamp")) return [name, new Date().toISOString()];
      if (type === "integer" || type === "number") return [name, 1];
      if (type === "boolean") return [name, false];
      return [name, "x"];
    }),
  );
}

async function discover(): Promise<{
  tables: string[];
  functions: string[];
  columns: Record<string, string[]>;
  args: Record<string, Record<string, unknown>>;
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/openapi+json" },
  });
  const spec = (await res.json()) as OpenApi;
  const paths = Object.keys(spec.paths).filter((p) => p !== "/");
  const tables = paths.filter((p) => !p.startsWith("/rpc/")).map((p) => p.slice(1));
  const functions = paths.filter((p) => p.startsWith("/rpc/")).map((p) => p.slice(5));
  const columns = Object.fromEntries(tables.map((t) => [t, Object.keys(spec.definitions[t]?.properties ?? {})]));
  const args = Object.fromEntries(functions.map((fn) => [fn, dummyArgs(spec, fn)]));
  return { tables: tables.sort(), functions: functions.sort(), columns, args };
}

describe.skipIf(!dbTestsEnabled)("permission sweep", () => {
  let found: Awaited<ReturnType<typeof discover>>;
  let player: Awaited<ReturnType<typeof newPlayer>>;

  beforeAll(async () => {
    [found, player] = await Promise.all([discover(), newPlayer()]);
  });

  it("knows about every table and function (add new ones to the lists above)", () => {
    expect(found.tables).toEqual(Object.keys(TABLES).sort());
    expect(found.functions).toEqual(Object.keys(FUNCTIONS).sort());
  });

  it("signed-out visitors can only read public tables", async () => {
    const anon = anonClient();
    for (const table of found.tables) {
      const { data, error } = await anon.from(table as never).select("*").limit(1);
      if (TABLES[table] === "public") {
        expect(error, table).toBeNull();
        expect(data!.length, table).toBeGreaterThan(0);
      } else {
        expect(data ?? [], table).toEqual([]);
      }
    }
  });

  it("signed-out visitors can only call public functions", async () => {
    const anon = anonClient();
    for (const fn of found.functions) {
      const { error } = await anon.rpc(fn as never, found.args[fn] as never);
      if (FUNCTIONS[fn] === "anyone") continue;
      expect(error, fn).not.toBeNull();
      expect(error!.code, fn).toBe("42501"); // permission denied
    }
  });

  it("nobody can insert, update or delete any table directly", async () => {
    const clients = { anon: anonClient(), player: player.client };
    for (const [who, client] of Object.entries(clients)) {
      for (const table of found.tables) {
        // A normal column (not the id, which may be auto-generated).
        const col = found.columns[table].find((c) => c !== "id" && c !== "display_name")!;
        const label = `${who} ${table}`;

        const insert = await client.from(table as never).insert({} as never);
        expect(insert.error?.code, `${label} insert`).toBe("42501"); // permission denied

        const update = await client.from(table as never).update({ [col]: null } as never).eq(col, NO_ROW);
        expect(update.error?.code, `${label} update ${col}`).toBe("42501"); // permission denied

        const del = await client.from(table as never).delete().eq(col, NO_ROW);
        expect(del.error?.code, `${label} delete`).toBe("42501"); // permission denied
      }
    }
  });

  it("the only direct write allowed is a player's own display name", async () => {
    const { error } = await player.client
      .from("profiles")
      .update({ display_name: "Allowed" })
      .eq("id", player.user.id);
    expect(error).toBeNull();
  });
});
