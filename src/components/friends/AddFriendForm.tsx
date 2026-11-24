"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { sendFriendRequest } from "@/services";
import { USERNAME_PATTERN, normaliseUsername } from "@/lib/auth/errors";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

export function AddFriendForm() {
  const router = useRouter();
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [refreshing, startRefresh] = useTransition();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const name = normaliseUsername(username.replace(/^@/, ""));
    if (!USERNAME_PATTERN.test(name)) {
      setError("Usernames are 3–20 letters, numbers or underscores.");
      return;
    }

    setSending(true);
    setError(null);
    try {
      const result = await sendFriendRequest(name);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast(
        result.data.status === "accepted"
          ? `You're now friends with @${name}!`
          : `Friend request sent to @${name}.`,
        "success",
      );
      setUsername("");
      startRefresh(() => router.refresh());
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
        <Field
          id="friend-username"
          label="Their username"
          className="flex-1"
          placeholder="e.g. iron_ivy"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={21}
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setError(null);
          }}
        />
        <Button type="submit" loading={sending || refreshing} disabled={!username.trim()}>
          Add
        </Button>
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <p className="text-xs text-muted">
        They&apos;ll see your request and can accept it. Friends can visit each other&apos;s kingdoms, but never see
        your workouts or wallet.
      </p>
    </form>
  );
}
