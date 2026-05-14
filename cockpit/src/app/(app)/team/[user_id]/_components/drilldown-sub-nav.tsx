/**
 * SLC-707 MT-6.5 — Sub-Nav-Strip im Drilldown.
 *
 * Tab-Strip mit 3 Links: Mein Tag / Pipeline / Aufgaben.
 * Aktive Route via usePathname() hervorgehoben. Brand-Tokens, kein Hex.
 *
 * Liegt im Drilldown-Layout (zwischen Banner und Children), damit der Strip
 * auf allen 3 Sub-Pages persistent sichtbar ist.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface Props {
  targetUserId: string;
}

interface Tab {
  href: string;
  label: string;
}

export function DrilldownSubNav({ targetUserId }: Props) {
  const pathname = usePathname();
  const base = `/team/${targetUserId}`;

  const tabs: Tab[] = [
    { href: `${base}/mein-tag`, label: "Mein Tag" },
    { href: `${base}/pipeline`, label: "Pipeline" },
    { href: `${base}/aufgaben`, label: "Aufgaben" },
  ];

  return (
    <nav
      aria-label="Drilldown-Bereiche"
      className="border-b border-border bg-background"
    >
      <div className="flex gap-1 overflow-x-auto px-4 md:px-8">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
