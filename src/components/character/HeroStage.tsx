"use client";

import dynamic from "next/dynamic";
import type { OutfitId } from "@/types/game";
import { Spinner } from "@/components/ui/States";
import { OUTFITS } from "./outfits";

// WebGL only exists in the browser, so the scene is never server-rendered.
const HeroScene = dynamic(() => import("./HeroScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Spinner className="h-8 w-8 text-gold-400" />
    </div>
  ),
});

export function HeroStage({ outfit, className = "" }: { outfit: OutfitId; className?: string }) {
  return (
    <div
      role="img"
      aria-label={`Your hero in the ${OUTFITS[outfit].label.toLowerCase()}. Drag to rotate.`}
      className={`relative cursor-grab touch-none active:cursor-grabbing ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[10%] top-[15%] bottom-[10%] rounded-full bg-gold-500/10 blur-3xl"
      />
      <HeroScene outfit={outfit} />
    </div>
  );
}
