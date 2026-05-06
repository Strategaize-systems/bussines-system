"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Palette, Receipt, Bell, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SidebarItem = {
  label: string;
  href: string;
  icon: typeof Palette;
  disabled?: boolean;
  comingSoon?: string;
};

const SIDEBAR_ITEMS: SidebarItem[] = [
  { label: "Branding", href: "/settings/branding", icon: Palette },
  {
    label: "Zahlungsbedingungen",
    href: "/settings/payment-terms",
    icon: Receipt,
  },
  {
    label: "Briefing",
    href: "/settings/briefing",
    icon: Bell,
  },
  {
    label: "Workflow-Automation",
    href: "/settings/automation",
    icon: Zap,
  },
];

const TOP_LEVEL_PATHS = new Set(["/settings", "/settings/"]);

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showSidebar = !TOP_LEVEL_PATHS.has(pathname);

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col md:flex-row">
      <aside className="md:w-56 md:flex-shrink-0 px-8 pt-8 md:pr-0">
        <nav className="flex flex-col gap-1 sticky top-4">
          <p className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Einstellungen
          </p>
          {SIDEBAR_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            const baseClasses =
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors";

            if (item.disabled) {
              return (
                <div
                  key={item.href}
                  className={cn(
                    baseClasses,
                    "cursor-not-allowed text-slate-400",
                  )}
                  title={item.comingSoon}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {item.comingSoon ? (
                    <span className="text-xs text-slate-400">bald</span>
                  ) : null}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  baseClasses,
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
