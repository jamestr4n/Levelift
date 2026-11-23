import type { OutfitId } from "@/types/game";

export interface OutfitStyle {
  label: string;
  tunic: string;
  sleeves: string;
  pants: string;
  accent: string;
}

export const OUTFITS: Record<OutfitId, OutfitStyle> = {
  starter: { label: "Starter outfit", tunic: "#8a6a48", sleeves: "#a9865f", pants: "#4a3a2c", accent: "#5c4330" },
  ranger: { label: "Ranger outfit", tunic: "#4f6b3c", sleeves: "#5f7d48", pants: "#3b3328", accent: "#2f4a2a" },
  knight: { label: "Knight outfit", tunic: "#8d96a3", sleeves: "#a7b0bc", pants: "#3c414a", accent: "#c99a3e" },
  mage: { label: "Mage outfit", tunic: "#4b3a78", sleeves: "#5d4a92", pants: "#2c2346", accent: "#e3b862" },
};

export const SKIN = "#e0b48f";
