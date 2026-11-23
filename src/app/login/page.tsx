// FRONTEND-OWNED. Sign in / create account. Signed-in players are redirected
// away by the middleware.
import { BRAND } from "@/components/brand";
import { AuthForm } from "@/components/auth/AuthForm";
import { Panel } from "@/components/ui/Panel";

const QUERY_ERRORS: Record<string, string> = {
  confirmation_failed: "That confirmation link is invalid or has expired. Try signing in, or create your account again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Panel className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl text-gold-300">{BRAND.name}</h1>
          <p className="mt-2 text-sm text-muted">{BRAND.tagline}</p>
        </div>
        <AuthForm initialError={error ? QUERY_ERRORS[error] : undefined} />
      </Panel>
    </div>
  );
}
