"use client";

import Link from "next/link";
import type { WorkoutRewardResult } from "@/types/game";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ResourceBadge } from "@/components/ui/ResourceBadge";
import { WORKOUT_LABELS, workoutDetail } from "./labels";

export function RewardModal({
  result,
  onClose,
}: {
  result: WorkoutRewardResult | null;
  onClose: () => void;
}) {
  const earnedNothing =
    result !== null && result.rewards.gold + result.rewards.materials + result.rewards.xp === 0;

  return (
    <Modal open={result !== null} onClose={onClose} title={result?.leveledUp ? "Level up!" : "Workout logged"}>
      {result && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            {WORKOUT_LABELS[result.workout.type]} · {workoutDetail(result.workout)}
          </p>

          {result.leveledUp && (
            <p className="rounded-xl border border-gold-500/50 bg-gold-400/10 px-4 py-3 text-center font-display text-gold-300">
              You reached level {result.player.level}!
            </p>
          )}

          {!earnedNothing && (
            <div className="flex flex-wrap justify-center gap-2">
              <ResourceBadge resource="gold" amount={result.rewards.gold} showSign />
              <ResourceBadge resource="materials" amount={result.rewards.materials} showSign />
              <ResourceBadge resource="xp" amount={result.rewards.xp} showSign />
            </div>
          )}

          {result.dailyLimitReached && (
            <p className="text-sm text-muted">
              {earnedNothing
                ? "You've reached today's reward limit, so this workout is saved without rewards."
                : "You've reached today's reward limit, so this workout earned a little less."}{" "}
              Rest is part of training too. Rewards reset tomorrow.
            </p>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <Link
              href="/kingdom"
              className="inline-flex h-10 items-center rounded-lg border border-ink-600 bg-ink-800 px-4 text-sm text-parchment hover:border-gold-500 hover:text-gold-300"
            >
              Spend in kingdom
            </Link>
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
