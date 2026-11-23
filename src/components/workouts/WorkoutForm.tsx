"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { logWorkout } from "@/services";
import { MAX_DAYS_AGO, WORKOUT_TYPES, validateWorkoutInput } from "@/lib/workouts/validate";
import type { WorkoutInput, WorkoutRewardResult, WorkoutType } from "@/types/game";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { errorMessage } from "@/components/ui/errorMessage";
import { DISTANCE_TYPES, WORKOUT_LABELS } from "./labels";
import { RewardModal } from "./RewardModal";

export function WorkoutForm() {
  const router = useRouter();
  const [type, setType] = useState<WorkoutType>("running");
  const [startedAt, setStartedAt] = useState("");
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [sets, setSets] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<WorkoutRewardResult | null>(null);

  // Reused when retrying the same workout after a failure, so the server never
  // rewards it twice. Cleared whenever the input changes or a log succeeds.
  const requestId = useRef<string | null>(null);

  function edit<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      requestId.current = null;
      setError(null);
    };
  }

  function buildInput(): WorkoutInput {
    requestId.current ??= crypto.randomUUID();
    const input: WorkoutInput = {
      type,
      startedAt: (startedAt ? new Date(startedAt) : new Date()).toISOString(),
      durationMinutes: Number(duration),
      clientRequestId: requestId.current,
    };
    if (DISTANCE_TYPES.includes(type) && distance !== "") input.distanceKm = Number(distance);
    if (type === "strength" && sets !== "") input.sets = Number(sets);
    return input;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const input = buildInput();
    const invalid = validateWorkoutInput(input);
    if (invalid) {
      setError(invalid);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      setResult(await logWorkout(input));
      requestId.current = null;
      setStartedAt("");
      setDuration("");
      setDistance("");
      setSets("");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <fieldset>
          <legend className="mb-1.5 text-sm text-muted">Activity</legend>
          <div className="grid grid-cols-4 gap-2">
            {WORKOUT_TYPES.map((t) => (
              <label
                key={t}
                className="cursor-pointer rounded-lg border border-ink-600 bg-ink-900 px-1 py-2.5 text-center text-sm text-muted transition-colors hover:text-parchment has-[:checked]:border-gold-400 has-[:checked]:bg-gold-400/10 has-[:checked]:text-gold-300 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold-400"
              >
                <input
                  type="radio"
                  name="type"
                  value={t}
                  checked={type === t}
                  onChange={() => edit(setType)(t)}
                  className="sr-only"
                />
                {WORKOUT_LABELS[t]}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <Field
            id="duration"
            label="Duration (minutes)"
            type="number"
            inputMode="numeric"
            min={1}
            max={600}
            step={1}
            required
            value={duration}
            onChange={(e) => edit(setDuration)(e.target.value)}
          />
          {DISTANCE_TYPES.includes(type) ? (
            <Field
              id="distance"
              label="Distance (km)"
              type="number"
              inputMode="decimal"
              min={0}
              max={300}
              step={0.1}
              placeholder="Optional"
              value={distance}
              onChange={(e) => edit(setDistance)(e.target.value)}
            />
          ) : (
            <Field
              id="sets"
              label="Sets"
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              step={1}
              placeholder="Optional"
              value={sets}
              onChange={(e) => edit(setSets)(e.target.value)}
            />
          )}
        </div>

        <Field
          id="startedAt"
          label="When did you start?"
          type="datetime-local"
          hint={`Leave blank for now. You can log workouts from the last ${MAX_DAYS_AGO} days.`}
          value={startedAt}
          onChange={(e) => edit(setStartedAt)(e.target.value)}
        />

        {error && (
          <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" loading={submitting}>
          {submitting ? "Saving…" : "Log workout"}
        </Button>
      </form>

      <RewardModal result={result} onClose={() => setResult(null)} />
    </>
  );
}
