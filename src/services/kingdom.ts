"use server";
// BACKEND-OWNED. Real implementation backed by Supabase (server actions).
// Purchases and upgrades run in the purchase_building() / upgrade_building()
// database functions, which check funds and charge in one transaction.
import { toGameError } from "@/lib/supabase/errors";
import {
  GameError,
  type KingdomState,
  type PurchaseBuildingInput,
  type PurchaseResult,
  type UpgradeResult,
} from "@/types/game";
import { toKingdomState, toOwnedBuilding } from "./mappers";
import { loadPlayer, requireUser } from "./session";

const BUILDING_COLUMNS = "id, type, level, x, y";

/**
 * The signed-in player's kingdom, or another player's kingdom (read-only) when
 * `userId` is given. Other kingdoms are only visible once friends can see each
 * other (week 4); until then they return NOT_FOUND.
 */
export async function getKingdom(userId?: string): Promise<KingdomState> {
  const { supabase, userId: viewerId } = await requireUser();
  const ownerId = userId ?? viewerId;

  const [kingdom, buildings] = await Promise.all([
    supabase.from("kingdoms").select("*").eq("user_id", ownerId).maybeSingle(),
    supabase.from("owned_buildings").select(BUILDING_COLUMNS).eq("user_id", ownerId).order("created_at"),
  ]);

  if (kingdom.error || buildings.error) throw toGameError(kingdom.error ?? buildings.error!);
  if (!kingdom.data) throw new GameError("NOT_FOUND", "Kingdom not found.");

  return toKingdomState(kingdom.data, buildings.data, viewerId);
}

export async function purchaseBuilding(input: PurchaseBuildingInput): Promise<PurchaseResult> {
  const { x, y } = input.position ?? {};
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    throw new GameError("INVALID_INPUT", "That plot is outside your kingdom.");
  }

  const { supabase, userId } = await requireUser();

  const { data, error } = await supabase.rpc("purchase_building", {
    p_type: input.type,
    p_x: x,
    p_y: y,
  });
  if (error) throw toGameError(error);

  const [building, player] = await Promise.all([loadBuilding(supabase, data), loadPlayer(supabase, userId)]);
  return { building, player };
}

export async function upgradeBuilding(buildingId: string): Promise<UpgradeResult> {
  const { supabase, userId } = await requireUser();

  const { data, error } = await supabase.rpc("upgrade_building", { p_building_id: buildingId });
  if (error) throw toGameError(error);

  const [building, player] = await Promise.all([loadBuilding(supabase, data), loadPlayer(supabase, userId)]);
  return { building, player };
}

async function loadBuilding(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  rpcResult: unknown,
) {
  const { building_id } = rpcResult as { building_id: string };
  const { data, error } = await supabase
    .from("owned_buildings")
    .select(BUILDING_COLUMNS)
    .eq("id", building_id)
    .single();
  if (error) throw new GameError("NOT_FOUND", "Building not found.");
  return toOwnedBuilding(data);
}
