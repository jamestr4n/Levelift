"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { isUsernameAvailable, signIn, signUp } from "@/services";
import { MIN_PASSWORD_LENGTH, USERNAME_PATTERN, normaliseUsername, validateSignUp } from "@/lib/auth/errors";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { errorMessage } from "@/components/ui/errorMessage";

type Mode = "signin" | "signup";
type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

const USERNAME_HINTS: Record<UsernameStatus, string> = {
  idle: "3-20 letters, numbers or underscores. Friends find you by this.",
  checking: "Checking…",
  available: "Available!",
  taken: "That username is already taken.",
  invalid: "Use 3-20 letters, numbers or underscores.",
};

export function AuthForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmEmailSentTo, setConfirmEmailSentTo] = useState<string | null>(null);
  const latestUsername = useRef("");

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function checkUsername() {
    const name = normaliseUsername(username);
    if (name === "") return setUsernameStatus("idle");
    if (!USERNAME_PATTERN.test(name)) return setUsernameStatus("invalid");
    setUsernameStatus("checking");
    try {
      const available = await isUsernameAvailable(name);
      // Ignore the answer if the player kept typing.
      if (normaliseUsername(latestUsername.current) === name) setUsernameStatus(available ? "available" : "taken");
    } catch {
      setUsernameStatus("idle");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (mode === "signup") {
      const invalid = validateSignUp({ email, password, username });
      if (invalid && !invalid.ok) return setError(invalid.message);
    } else if (!email.trim() || !password) {
      return setError("Please enter your email and password.");
    }

    setSubmitting(true);
    try {
      const result =
        mode === "signup" ? await signUp({ email, password, username }) : await signIn({ email, password });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (result.needsEmailConfirmation) {
        setConfirmEmailSentTo(email.trim());
        return;
      }
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmEmailSentTo) {
    return (
      <div role="status" className="flex flex-col gap-3 text-center">
        <p className="font-display text-lg text-gold-300">Check your inbox</p>
        <p className="text-sm text-muted">
          We sent a confirmation link to <span className="text-parchment">{confirmEmailSentTo}</span>. Click it to
          enter your kingdom.
        </p>
        <Button
          variant="ghost"
          onClick={() => {
            setConfirmEmailSentTo(null);
            switchMode("signin");
          }}
        >
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div role="group" aria-label="Account" className="grid grid-cols-2 rounded-lg border border-ink-600 bg-ink-900 p-1">
        {(
          [
            ["signin", "Sign in"],
            ["signup", "Create account"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => switchMode(value)}
            className={`rounded-md py-2 text-sm transition-colors ${
              mode === value ? "bg-gold-400/15 text-gold-300" : "text-muted hover:text-parchment"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 text-left">
        {mode === "signup" && (
          <Field
            id="username"
            label="Username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={20}
            hint={USERNAME_HINTS[usernameStatus]}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              latestUsername.current = e.target.value;
              setUsernameStatus("idle");
            }}
            onBlur={checkUsername}
          />
        )}
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          hint={mode === "signup" ? `At least ${MIN_PASSWORD_LENGTH} characters.` : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" loading={submitting}>
          {mode === "signup" ? "Create account" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
