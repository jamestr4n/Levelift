"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { NavBar } from "./NavBar";

const ROUTES_WITHOUT_NAV = ["/login"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (ROUTES_WITHOUT_NAV.some((route) => pathname.startsWith(route))) {
    return <main className="min-h-dvh">{children}</main>;
  }

  return (
    <>
      <NavBar />
      <main className="min-h-dvh pb-24 md:pb-0 md:pl-56">{children}</main>
    </>
  );
}
