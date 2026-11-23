import { CoinIcon, MaterialsIcon, StarIcon } from "./icons";

type Resource = "gold" | "materials" | "xp";

const config: Record<Resource, { label: string; Icon: typeof CoinIcon; color: string }> = {
  gold: { label: "Gold", Icon: CoinIcon, color: "text-gold-400" },
  materials: { label: "Materials", Icon: MaterialsIcon, color: "text-steel-300" },
  xp: { label: "XP", Icon: StarIcon, color: "text-gold-300" },
};

const formatter = new Intl.NumberFormat("en-GB");

export function ResourceBadge({
  resource,
  amount,
  showSign = false,
}: {
  resource: Resource;
  amount: number;
  /** Prefix positive amounts with "+", e.g. for reward summaries. */
  showSign?: boolean;
}) {
  const { label, Icon, color } = config[resource];
  const text = `${showSign && amount > 0 ? "+" : ""}${formatter.format(amount)}`;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-900/80 px-3 py-1 text-sm tabular-nums"
      aria-label={`${text} ${label}`}
    >
      <Icon className={`h-4 w-4 ${color}`} />
      <span className="text-parchment">{text}</span>
    </span>
  );
}
