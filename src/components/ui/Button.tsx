import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "./States";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-gold-300 to-gold-500 text-ink-950 shadow-[0_0_20px_-6px] shadow-gold-400/60 hover:from-gold-300 hover:to-gold-400",
  secondary: "border border-ink-600 bg-ink-800 text-parchment hover:border-gold-500 hover:text-gold-300",
  ghost: "text-muted hover:bg-ink-800 hover:text-parchment",
  danger: "border border-danger/50 bg-danger/10 text-danger hover:bg-danger/20",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
