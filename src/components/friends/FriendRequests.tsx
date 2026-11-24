"use client";

import { removeFriend, respondToFriendRequest } from "@/services";
import type { FriendRequest } from "@/types/game";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useFriendAction } from "./useFriendAction";

export function FriendRequests({ requests }: { requests: FriendRequest[] }) {
  const { run, busyKey, working } = useFriendAction();
  const incoming = requests.filter((r) => r.direction === "incoming");
  const outgoing = requests.filter((r) => r.direction === "outgoing");

  if (requests.length === 0) {
    return <p className="text-sm text-muted">No pending requests.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {incoming.length > 0 && (
        <section aria-labelledby="incoming-heading">
          <h3 id="incoming-heading" className="mb-2 text-xs text-muted uppercase">
            Wants to be your friend
          </h3>
          <ul className="flex flex-col gap-2">
            {incoming.map(({ id, user }) => (
              <li key={id} className="flex flex-wrap items-center gap-3 rounded-xl border border-gold-500/40 bg-gold-400/5 p-3">
                <Avatar name={user.displayName} highlight />
                <div className="min-w-0 flex-1 basis-40">
                  <p className="truncate text-sm text-parchment">{user.displayName}</p>
                  <p className="truncate text-xs text-muted">
                    @{user.username} · Level {user.level}
                  </p>
                </div>
                <div className="ml-auto flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={working}
                    loading={busyKey === `decline-${id}`}
                    onClick={() =>
                      run(`decline-${id}`, () => respondToFriendRequest(id, false), `Declined @${user.username}.`)
                    }
                    aria-label={`Decline ${user.displayName}`}
                  >
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    disabled={working}
                    loading={busyKey === `accept-${id}`}
                    onClick={() =>
                      run(
                        `accept-${id}`,
                        () => respondToFriendRequest(id, true),
                        `You're now friends with ${user.displayName}!`,
                      )
                    }
                    aria-label={`Accept ${user.displayName}`}
                  >
                    Accept
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {outgoing.length > 0 && (
        <section aria-labelledby="outgoing-heading">
          <h3 id="outgoing-heading" className="mb-2 text-xs text-muted uppercase">
            Waiting for them
          </h3>
          <ul className="flex flex-col gap-2">
            {outgoing.map(({ id, user }) => (
              <li key={id} className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-700 bg-ink-900/70 p-3">
                <Avatar name={user.displayName} />
                <div className="min-w-0 flex-1 basis-40">
                  <p className="truncate text-sm text-parchment">{user.displayName}</p>
                  <p className="truncate text-xs text-muted">@{user.username} · Pending</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={working}
                  loading={busyKey === `cancel-${id}`}
                  onClick={() =>
                    run(`cancel-${id}`, () => removeFriend(user.id), `Cancelled your request to @${user.username}.`)
                  }
                  aria-label={`Cancel request to ${user.displayName}`}
                >
                  Cancel
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
