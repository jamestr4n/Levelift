"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/types/game";
import { useToast } from "@/components/ui/Toast";

/**
 * Runs a friend action that returns ActionResult, shows the outcome as a
 * toast and reloads the page data. `busyKey` says which row is working, so
 * only that row's buttons show a spinner while every button is disabled.
 */
export function useFriendAction() {
  const router = useRouter();
  const toast = useToast();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [refreshing, startRefresh] = useTransition();

  async function run<T>(key: string, action: () => Promise<ActionResult<T>>, success: string) {
    setBusyKey(key);
    try {
      const result = await action();
      if (result.ok) {
        toast(success, "success");
        startRefresh(() => router.refresh());
      } else {
        toast(result.message, "error");
      }
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setBusyKey(null);
    }
  }

  return { run, busyKey, working: busyKey !== null || refreshing };
}
