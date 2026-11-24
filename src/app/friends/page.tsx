// FRONTEND-OWNED. Add friends, answer requests and visit friends' kingdoms.
import { getFriendRequests, getFriends } from "@/services";
import { AddFriendForm } from "@/components/friends/AddFriendForm";
import { FriendList } from "@/components/friends/FriendList";
import { FriendRequests } from "@/components/friends/FriendRequests";
import { Page } from "@/components/ui/Page";
import { Panel } from "@/components/ui/Panel";

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const [friends, requests] = await Promise.all([getFriends(), getFriendRequests()]);
  const incoming = requests.filter((r) => r.direction === "incoming").length;

  return (
    <Page title="Friends" subtitle="Visit your friends' kingdoms and see who's building fastest.">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-4">
          <Panel title="Add a friend">
            <AddFriendForm />
          </Panel>
          <Panel
            title="Requests"
            action={
              incoming > 0 && (
                <span className="rounded-full bg-gold-400 px-2 py-0.5 text-xs font-medium text-ink-950">
                  {incoming} new
                </span>
              )
            }
          >
            <FriendRequests requests={requests} />
          </Panel>
        </div>
        <Panel title={`Your friends${friends.length ? ` (${friends.length})` : ""}`}>
          <FriendList friends={friends} />
        </Panel>
      </div>
    </Page>
  );
}
