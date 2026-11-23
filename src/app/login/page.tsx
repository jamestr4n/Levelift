// FRONTEND-OWNED. Placeholder page.
import { BRAND } from "@/components/brand";
import { Panel } from "@/components/ui/Panel";

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <Panel className="w-full max-w-sm text-center">
        <h1 className="font-display text-3xl text-gold-300">{BRAND.name}</h1>
        <p className="mt-2 text-sm text-muted">{BRAND.tagline}</p>
        <p className="mt-6 text-sm text-muted">Sign-in screen coming soon.</p>
      </Panel>
    </div>
  );
}
