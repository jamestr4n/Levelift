"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND } from "@/components/brand";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { FriendsIcon, HeroIcon, KingdomIcon, TrophyIcon, WorkoutIcon } from "./icons";

const NAV_ITEMS = [
  { href: "/", label: "Hero", Icon: HeroIcon },
  { href: "/workouts", label: "Workouts", Icon: WorkoutIcon },
  { href: "/kingdom", label: "Kingdom", Icon: KingdomIcon },
  { href: "/friends", label: "Friends", Icon: FriendsIcon },
  { href: "/leaderboard", label: "Ranks", Icon: TrophyIcon },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function NavBar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: side rail */}
      <nav
        aria-label="Main"
        className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-ink-700 bg-ink-900/80 px-3 py-6 backdrop-blur md:flex"
      >
        <Link href="/" className="mb-8 px-3 font-display text-xl tracking-wide text-gold-300">
          {BRAND.name}
        </Link>
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? "bg-gold-400/10 text-gold-300"
                      : "text-muted hover:bg-ink-800 hover:text-parchment"
                  }`}
                >
                  <Icon />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
        <SignOutButton className="mt-auto px-3 py-2.5 text-left" />
      </nav>

      {/* Mobile: bottom tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-700 bg-ink-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-5">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${
                    active ? "text-gold-300" : "text-muted"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
