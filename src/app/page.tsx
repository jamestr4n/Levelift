// FRONTEND-OWNED. Character hub (home screen).
import Link from "next/link";
import { getCharacter, getCurrentPlayer, getWorkoutHistory } from "@/services";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { HeroStage } from "@/components/character/HeroStage";
import { OUTFITS } from "@/components/character/outfits";
import { TodayActivity } from "@/components/character/TodayActivity";
import { FriendsIcon, KingdomIcon, WorkoutIcon } from "@/components/ui/icons";
import { Panel } from "@/components/ui/Panel";
import { ResourceBadge } from "@/components/ui/ResourceBadge";
import { XpBar } from "@/components/ui/XpBar";

export const dynamic = "force-dynamic";

const QUICK_LINKS = [
  { href: "/workouts", label: "Log a workout", hint: "Earn rewards", Icon: WorkoutIcon },
  { href: "/kingdom", label: "Your kingdom", hint: "Build and upgrade", Icon: KingdomIcon },
  { href: "/friends", label: "Friends", hint: "Visit their kingdoms", Icon: FriendsIcon },
];

export default async function HeroPage() {
  const [player, character, workouts] = await Promise.all([
    getCurrentPlayer(),
    getCharacter(),
    getWorkoutHistory(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 md:px-8 lg:py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-parchment md:text-3xl">{player.displayName}</h1>
          <p className="text-sm text-muted">
            @{player.username} · {OUTFITS[character.outfit].label}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ResourceBadge resource="gold" amount={player.gold} />
          <ResourceBadge resource="materials" amount={player.materials} />
          {/* The mobile tab bar has no room for it. */}
          <SignOutButton className="px-2 py-1 md:hidden" />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)_19rem] lg:items-start">
        <HeroStage
          outfit={character.outfit}
          className="h-[55dvh] min-h-80 lg:order-2 lg:h-[calc(100dvh-10rem)] lg:max-h-[44rem]"
        />

        <div className="flex flex-col gap-4 lg:order-1">
          <Panel title="Progress">
            <XpBar level={player.level} xp={player.xp} xpToNextLevel={player.xpToNextLevel} />
            <div className="mt-4 flex items-baseline justify-between text-sm">
              <span className="text-muted">Kingdom score</span>
              <span className="font-display text-lg text-gold-300 tabular-nums">{player.kingdomScore}</span>
            </div>
          </Panel>

          <nav aria-label="Quick actions" className="grid grid-cols-3 gap-2 lg:grid-cols-1">
            {QUICK_LINKS.map(({ href, label, hint, Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex flex-col items-center gap-1 rounded-xl border border-ink-700 bg-ink-800/70 p-3 text-center transition-colors hover:border-gold-500 lg:flex-row lg:gap-3 lg:text-left"
              >
                <Icon className="h-6 w-6 text-gold-400" />
                <span>
                  <span className="block text-sm text-parchment group-hover:text-gold-300">{label}</span>
                  <span className="hidden text-xs text-muted lg:block">{hint}</span>
                </span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="lg:order-3">
          <TodayActivity workouts={workouts} />
        </div>
      </div>
    </div>
  );
}
