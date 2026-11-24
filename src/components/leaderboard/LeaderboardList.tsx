import Link from "next/link";
import type { LeaderboardEntry } from "@/types/game";
import { kingdomHref } from "@/components/friends/links";
import { Avatar } from "@/components/ui/Avatar";

const numberFormat = new Intl.NumberFormat("en-GB");

const PODIUM: Record<number, string> = {
  1: "border-gold-400 bg-gold-400/20 text-gold-300",
  2: "border-steel-300/70 bg-steel-300/10 text-steel-300",
  3: "border-[#c08457]/70 bg-[#c08457]/10 text-[#d9a27a]",
};

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-display text-sm tabular-nums ${
        PODIUM[rank] ?? "border-ink-600 text-muted"
      }`}
    >
      {rank}
    </span>
  );
}

export function LeaderboardList({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {entries.map((entry) => {
        const content = (
          <>
            <RankBadge rank={entry.rank} />
            <Avatar name={entry.displayName} highlight={entry.isCurrentUser} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-parchment">
                {entry.displayName}
                {entry.isCurrentUser && <span className="ml-2 text-xs text-gold-400">You</span>}
              </span>
              <span className="block text-xs text-muted tabular-nums">
                {numberFormat.format(entry.weeklyXp)} XP this week
              </span>
            </span>
            <span className="text-right">
              <span className="block font-display text-lg text-gold-300 tabular-nums">
                +{numberFormat.format(entry.weeklyKingdomScore)}
              </span>
              <span className="block text-xs text-muted">score</span>
            </span>
          </>
        );

        const label = `Rank ${entry.rank}: ${entry.isCurrentUser ? "you" : entry.displayName}, +${entry.weeklyKingdomScore} Kingdom Score and ${entry.weeklyXp} XP this week`;
        const rowClass = `flex items-center gap-3 rounded-xl border p-3 ${
          entry.isCurrentUser ? "border-gold-500/60 bg-gold-400/10" : "border-ink-700 bg-ink-900/70"
        }`;

        return (
          <li key={entry.userId}>
            {entry.isCurrentUser ? (
              <div className={rowClass} aria-label={label}>
                {content}
              </div>
            ) : (
              <Link
                href={kingdomHref(entry.userId)}
                className={`${rowClass} transition-colors hover:border-gold-500`}
                aria-label={`${label}. Visit their kingdom.`}
              >
                {content}
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}
