// BACKEND-OWNED. Real implementation backed by Supabase.
// Purchases and upgrades must be atomic (a Postgres function called via supabase.rpc).
import type {
  KingdomState,
  PurchaseBuildingInput,
  PurchaseResult,
  UpgradeResult,
} from "@/types/game";
import { notImplemented } from "./notImplemented";

export async function getKingdom(userId?: string): Promise<KingdomState> {
  void userId;
  return notImplemented("getKingdom");
}

export async function purchaseBuilding(input: PurchaseBuildingInput): Promise<PurchaseResult> {
  void input;
  return notImplemented("purchaseBuilding");
}

export async function upgradeBuilding(buildingId: string): Promise<UpgradeResult> {
  void buildingId;
  return notImplemented("upgradeBuilding");
}
