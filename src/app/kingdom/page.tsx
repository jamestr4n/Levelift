// FRONTEND-OWNED. The player's own 3D kingdom (buy, place, upgrade), or a
// friend's kingdom in read-only mode at /kingdom?user=<friend id>.
import Link from "next/link";
import { getCurrentPlayer, getFriends, getKingdom } from "@/services";
import { KingdomView } from "@/components/kingdom/KingdomView";
import { Page } from "@/components/ui/Page";
import { EmptyState } from "@/components/ui/States";

export const dynamic = "force-dynamic";

const backToFriends = (
  <Link
    href="/friends"
    className="inline-flex h-10 items-center rounded-lg border border-ink-600 bg-ink-800 px-4 text-sm text-parchment hover:border-gold-500 hover:text-gold-300"
  >
    Back to friends
  </Link>
);

export default async function KingdomPage({ searchParams }: { searchParams: Promise<{ user?: string | string[] }> }) {
  const { user } = await searchParams;
  const visitId = typeof user === "string" && user ? user : undefined;
  const player = await getCurrentPlayer();

  if (!visitId || visitId === player.id) {
    const kingdom = await getKingdom();
    return (
      <Page title="Kingdom" subtitle="Spend your workout rewards to build and upgrade.">
        <KingdomView key={kingdom.ownerId} kingdom={kingdom} player={player} />
      </Page>
    );
  }

  // Only friends' kingdoms are visible. Check the friends list first so a
  // stranger's id gets a clear message rather than an error page.
  const friend = (await getFriends()).find((f) => f.id === visitId);
  if (!friend) {
    return (
      <Page title="Kingdom not found">
        <EmptyState
          title="You can't visit this kingdom"
          description="You can only visit the kingdoms of players who have accepted your friend request."
          action={backToFriends}
        />
      </Page>
    );
  }

  const kingdom = await getKingdom(friend.id);
  return (
    <Page
      title={`${friend.displayName}'s kingdom`}
      subtitle={`@${friend.username} · Level ${friend.level} · You're visiting, so nothing here can be changed.`}
      action={backToFriends}
    >
      <KingdomView key={kingdom.ownerId} kingdom={kingdom} player={player} ownerName={friend.displayName} />
    </Page>
  );
}
