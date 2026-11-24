"use client";

import { useState } from "react";
import Link from "next/link";
import { removeFriend } from "@/services";
import type { FriendProfile } from "@/types/game";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/States";
import { kingdomHref } from "./links";
import { useFriendAction } from "./useFriendAction";

export function FriendList({ friends }: { friends: FriendProfile[] }) {
  const { run, busyKey, working } = useFriendAction();
  const [confirming, setConfirming] = useState<FriendProfile | null>(null);

  if (friends.length === 0) {
    return (
      <EmptyState
        title="No friends yet"
        description="Add a friend by username to visit each other's kingdoms and compete on the weekly leaderboard."
      />
    );
  }

  async function confirmRemove() {
    if (!confirming) return;
    const friend = confirming;
    setConfirming(null);
    await run(`remove-${friend.id}`, () => removeFriend(friend.id), `Removed ${friend.displayName} from your friends.`);
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {friends.map((friend) => (
          <li
            key={friend.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-700 bg-ink-900/70 p-3"
          >
            <Avatar name={friend.displayName} />
            <div className="min-w-0 flex-1 basis-40">
              <p className="truncate text-parchment">{friend.displayName}</p>
              <p className="truncate text-xs text-muted">
                @{friend.username} · Level {friend.level} ·{" "}
                <span className="text-gold-300">{friend.kingdomScore} score</span>
              </p>
            </div>
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={working}
                loading={busyKey === `remove-${friend.id}`}
                onClick={() => setConfirming(friend)}
                aria-label={`Remove ${friend.displayName}`}
              >
                Remove
              </Button>
              <Link
                href={kingdomHref(friend.id)}
                className="inline-flex h-8 items-center rounded-lg border border-ink-600 bg-ink-800 px-3 text-sm text-parchment transition-colors hover:border-gold-500 hover:text-gold-300"
                aria-label={`Visit ${friend.displayName}'s kingdom`}
              >
                Visit kingdom
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <Modal open={confirming !== null} onClose={() => setConfirming(null)} title="Remove friend?">
        {confirming && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">
              You and {confirming.displayName} won&apos;t be able to visit each other&apos;s kingdoms or see each
              other on the leaderboard. You can add them again later.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirming(null)}>
                Keep
              </Button>
              <Button variant="danger" onClick={confirmRemove}>
                Remove
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
