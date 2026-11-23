"use client";

import Link from "next/link";
import type { Workout } from "@/types/game";
import { Panel } from "@/components/ui/Panel";
import { ResourceBadge } from "@/components/ui/ResourceBadge";
import { useHydrated } from "@/components/ui/useHydrated";
import { WORKOUT_LABELS, workoutDetail } from "@/components/workouts/labels";

export function TodayActivity({ workouts }: { workouts: Workout[] }) {
  // "Today" must use the player's timezone, which only the browser knows.
  const hydrated = useHydrated();
  const todayKey = hydrated ? new Date().toDateString() : null;
  const today = todayKey
    ? workouts.filter((w) => new Date(w.startedAt).toDateString() === todayKey)
    : [];
  const totals = today.reduce(
    (sum, w) => ({
      gold: sum.gold + w.rewards.gold,
      materials: sum.materials + w.rewards.materials,
      xp: sum.xp + w.rewards.xp,
    }),
    { gold: 0, materials: 0, xp: 0 },
  );

  return (
    <Panel title="Today">
      {todayKey === null ? (
        <div className="h-24" />
      ) : today.length === 0 ? (
        <div className="py-2">
          <p className="text-sm text-muted">No workouts yet today. Every session earns Gold, Materials and XP.</p>
          <Link
            href="/workouts"
            className="mt-3 inline-flex h-9 items-center rounded-lg bg-gradient-to-b from-gold-300 to-gold-500 px-4 text-sm font-medium text-ink-950"
          >
            Log a workout
          </Link>
        </div>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-ink-700">
            {today.map((w) => (
              <li key={w.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                <span className="text-parchment">{WORKOUT_LABELS[w.type]}</span>
                <span className="text-muted tabular-nums">{workoutDetail(w)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 mb-2 text-xs tracking-wide text-muted uppercase">Earned today</p>
          <div className="flex flex-wrap gap-2">
            <ResourceBadge resource="gold" amount={totals.gold} showSign />
            <ResourceBadge resource="materials" amount={totals.materials} showSign />
            <ResourceBadge resource="xp" amount={totals.xp} showSign />
          </div>
        </>
      )}
    </Panel>
  );
}
