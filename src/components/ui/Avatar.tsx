/** Placeholder player avatar: the first letter of their name in a gold ring. */
export function Avatar({ name, highlight = false }: { name: string; highlight?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-display text-lg ${
        highlight ? "border-gold-400 bg-gold-400/15 text-gold-300" : "border-ink-600 bg-ink-900 text-parchment"
      }`}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
