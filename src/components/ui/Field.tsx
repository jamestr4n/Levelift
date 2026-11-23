import type { InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  hint?: string;
}

export function Field({ id, label, hint, className = "", ...inputProps }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm text-muted">
        {label}
      </label>
      <input
        {...inputProps}
        id={id}
        aria-describedby={hintId}
        className="h-10 w-full rounded-lg border border-ink-600 bg-ink-900 px-3 text-parchment placeholder:text-muted/60 focus:border-gold-400 disabled:opacity-50"
      />
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
