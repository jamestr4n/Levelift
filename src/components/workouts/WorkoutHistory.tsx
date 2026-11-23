"use client";

import type { Workout } from "@/types/game";
import { ResourceBadge } from "@/components/ui/ResourceBadge";
import { EmptyState } from "@/components/ui/States";
import { useHydrated } from "@/components/ui/useHydrated";
import { WORKOUT_LABELS, workoutDetail } from "./labels";

const whenFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function WorkoutHistory({ workouts }: { workouts: Workout[] }) {
  const hydrated = useHydrated();

  if (workouts.length === 0) {
    return (
      <EmptyState
        title="No workouts yet"
        description="Log your first workout to start earning Gold, Materials and XP."
      />
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-ink-700">
      {workouts.map((w) => {
        const { gold, materials, xp } = w.rewards;
        return (
          <li key={w.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
            <div>
              <p className="text-parchment">
                {WORKOUT_LABELS[w.type]} <span className="text-sm text-muted">· {workoutDetail(w)}</span>
              </p>
              {/* Dates render after hydration so they use the player's timezone. */}
              <p className="text-xs text-muted">{hydrated ? whenFormat.format(new Date(w.startedAt)) : " "}</p>
            </div>
            {gold + materials + xp > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                <ResourceBadge resource="gold" amount={gold} showSign />
                <ResourceBadge resource="materials" amount={materials} showSign />
                <ResourceBadge resource="xp" amount={xp} showSign />
              </div>
            ) : (
              <span className="text-xs text-muted">No rewards (daily limit)</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
