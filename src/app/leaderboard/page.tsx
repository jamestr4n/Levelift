// FRONTEND-OWNED. Weekly leaderboard: you and your friends, ranked by
// Kingdom Score gained this week (then weekly XP).
import Link from "next/link";
import { getWeeklyLeaderboard } from "@/services";
import { LeaderboardList } from "@/components/leaderboard/LeaderboardList";
import { Page } from "@/components/ui/Page";
import { Panel } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/States";

export const dynamic = "force-dynamic";

const linkClass =
  "inline-flex h-10 items-center rounded-lg border border-ink-600 bg-ink-800 px-4 text-sm text-parchment hover:border-gold-500 hover:text-gold-300";

export default async function LeaderboardPage() {
  const entries = await getWeeklyLeaderboard();
  const hasFriends = entries.some((e) => !e.isCurrentUser);

  return (
    <Page title="Weekly ranks" subtitle="Who grew their kingdom the most this week? Resets every Monday at 00:00 UTC.">
      <div className="flex flex-col gap-4">
        <Panel title="This week">
          {entries.length === 0 ? (
            <EmptyState title="No rankings yet" description="Log a workout and build to get on the board." />
          ) : (
            <LeaderboardList entries={entries} />
          )}
        </Panel>

        {!hasFriends && (
          <EmptyState
            title="It's lonely at the top"
            description="Add friends to compare how much your kingdoms grow each week."
            action={
              <Link href="/friends" className={linkClass}>
                Add friends
              </Link>
            }
          />
        )}

        <p className="text-center text-xs text-muted">
          Ranked by Kingdom Score gained from buying and upgrading buildings this week, then by XP. Only you and your
          friends appear here.
        </p>
      </div>
    </Page>
  );
}
