// FRONTEND-OWNED. Character hub (home screen). Placeholder.
import Link from "next/link";

export default function Home() {
  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Levelift</h1>
      <p>Character hub (coming soon)</p>
      <nav className="flex gap-4 underline">
        <Link href="/workouts">Workouts</Link>
        <Link href="/kingdom">Kingdom</Link>
        <Link href="/friends">Friends</Link>
        <Link href="/leaderboard">Leaderboard</Link>
      </nav>
    </main>
  );
}
