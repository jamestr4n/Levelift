import type { ReactNode } from "react";

export function Panel({
  title,
  action,
  className = "",
  children,
}: {
  title?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-ink-700 bg-ink-800/70 p-4 backdrop-blur-sm md:p-5 ${className}`}
    >
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          {title && (
            <h2 className="font-display text-sm tracking-widest text-gold-400 uppercase">{title}</h2>
          )}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
