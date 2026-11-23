"use client";

import { errorMessage } from "@/components/ui/errorMessage";
import { ErrorState } from "@/components/ui/States";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 md:px-8">
      <ErrorState message={errorMessage(error)} onRetry={reset} />
    </div>
  );
}
