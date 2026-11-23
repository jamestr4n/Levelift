"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/services";

export function SignOutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      await signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`rounded-lg text-sm text-muted transition-colors hover:text-parchment disabled:opacity-50 ${className}`}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
