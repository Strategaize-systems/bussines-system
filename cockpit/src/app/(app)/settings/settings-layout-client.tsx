"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { filterByRole } from "@/lib/navigation/sidebar-config";
import type { Role } from "@/lib/auth/types";

const TOP_LEVEL_PATHS = new Set(["/settings", "/settings/"]);

export function SettingsLayoutClient({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const showSidebar = !TOP_LEVEL_PATHS.has(pathname);

  if (!showSidebar) {
    return <>{children}</>;
  }

  // SLC-711 DEC-196b: Single source of truth via SIDEBAR_CONFIG.
  // Slug-Filter holt alle /settings/*-Sub-Pages, exklusive der /settings-
  // Landing (die hat ihre eigene Kachel-Sicht).
  const items = filterByRole(role).filter((item) =>
    item.href.startsWith("/settings/"),
  );

  return (
    <div className="flex flex-col md:flex-row">
      <aside className="md:w-56 md:flex-shrink-0 px-8 pt-8 md:pr-0">
        <nav className="flex flex-col gap-1 sticky top-4">
          <p className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Einstellungen
          </p>
          {items.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-slate-100 text-slate-900 font-medium"
                    : "text-slate-700 hover:bg-slate-50",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <Link
            href="/settings"
            className="mt-2 px-3 py-2 text-xs text-slate-500 hover:text-slate-700"
          >
            ← Alle Einstellungen
          </Link>
        </nav>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
