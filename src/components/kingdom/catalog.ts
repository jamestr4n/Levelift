import type { BuildingType } from "@/types/game";

/**
 * DISPLAY-ONLY building info for the shop UI.
 *
 * Costs and scores copy the placeholder numbers in
 * supabase/migrations/20261123215944_kingdom_economy.sql so players can see
 * prices before they buy. They are NEVER used to decide a purchase: the
 * database function purchase_building() checks funds and charges, and the UI
 * shows whatever it returns. If the numbers drift, the worst case is a stale
 * price label, never a wrong charge.
 *
 * TODO(team): replace with a getBuildingDefinitions() service call once the
 * contract (src/types/game.ts) has one, then delete the numbers here.
 */
export interface BuildingInfo {
  name: string;
  blurb: string;
  /** Whether players can buy it from the shop (every kingdom starts with one Town Hall). */
  buildable: boolean;
  maxLevel: number;
  /** Index 0 = buy price, index n = price to upgrade from level n to n + 1. */
  costs: Array<{ gold: number; materials: number }>;
  scoreByLevel: number[];
}

export const BUILDINGS: Record<BuildingType, BuildingInfo> = {
  town_hall: {
    name: "Town Hall",
    blurb: "The heart of your kingdom.",
    buildable: false,
    maxLevel: 3,
    costs: [{ gold: 0, materials: 0 }, { gold: 300, materials: 60 }, { gold: 600, materials: 120 }],
    scoreByLevel: [15, 35, 60],
  },
  house: {
    name: "House",
    blurb: "A cosy home for your townsfolk.",
    buildable: true,
    maxLevel: 3,
    costs: [{ gold: 100, materials: 10 }, { gold: 150, materials: 25 }, { gold: 250, materials: 50 }],
    scoreByLevel: [5, 10, 18],
  },
  farm: {
    name: "Farm",
    blurb: "Golden fields that feed the realm.",
    buildable: true,
    maxLevel: 3,
    costs: [{ gold: 120, materials: 20 }, { gold: 180, materials: 35 }, { gold: 280, materials: 60 }],
    scoreByLevel: [6, 12, 20],
  },
  workshop: {
    name: "Workshop",
    blurb: "Where tools and wonders are made.",
    buildable: true,
    maxLevel: 3,
    costs: [{ gold: 180, materials: 40 }, { gold: 260, materials: 60 }, { gold: 400, materials: 90 }],
    scoreByLevel: [8, 16, 28],
  },
};

export const BUILDABLE_TYPES = (Object.keys(BUILDINGS) as BuildingType[]).filter((t) => BUILDINGS[t].buildable);

/** Price to upgrade from `level` to `level + 1`, or null at max level. */
export function upgradeCost(type: BuildingType, level: number) {
  const info = BUILDINGS[type];
  return level >= info.maxLevel ? null : (info.costs[level] ?? null);
}

/** Display hint only; the server makes the real decision. */
export function canAfford(
  wallet: { gold: number; materials: number },
  cost: { gold: number; materials: number },
) {
  return wallet.gold >= cost.gold && wallet.materials >= cost.materials;
}
