"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Handshake,
  TrendingUp,
  Target,
  CheckSquare,
  Calendar,
  BarChart3,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

type NavItem = {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "ÜBERSICHT",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Mein Tag", href: "/mein-tag", icon: Sparkles },
    ],
  },
  {
    label: "BEZIEHUNGEN",
    items: [
      { name: "Multiplikatoren", href: "/multiplikatoren", icon: Handshake },
      { name: "Firmen", href: "/companies", icon: Building2 },
      { name: "Kontakte", href: "/contacts", icon: Users },
    ],
  },
  {
    label: "VERTRIEB",
    items: [
      { name: "Pipeline", href: "/pipeline/multiplikatoren", icon: TrendingUp },
      { name: "Chancen", href: "/pipeline/unternehmer", icon: Target },
    ],
  },
  {
    label: "AKTIVITÄTEN",
    items: [
      { name: "Aufgaben", href: "/aufgaben", icon: CheckSquare },
      { name: "Termine", href: "/termine", icon: Calendar },
    ],
  },
  {
    label: "REPORTS",
    items: [
      { name: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-30 flex h-screen flex-col transition-all duration-300 max-md:hidden",
        collapsed ? "w-16" : "w-64"
      )}
      style={{ background: "linear-gradient(to bottom, #0f172a, #0f172a, #020617)" }}
    >
      {/* Logo Block */}
      <div className={cn("mx-3 mt-4 mb-2", collapsed ? "px-1" : "px-3")}>
        {!collapsed ? (
          <div className="rounded-2xl bg-white p-4 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-full.png" alt="StrategAIze" className="h-10 w-auto" />
          </div>
        ) : (
          <div className="mx-auto w-fit rounded-xl bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-symbol.png" alt="S" className="h-6 w-6" />
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-1 text-slate-500 hover:text-white transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {group.label}
              </div>
            )}
            {collapsed && (
              <div className="mx-auto my-2 h-px w-6 bg-white/10" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-r from-[#4454b8] to-[#120774] text-white shadow-[0_10px_15px_-3px_rgba(68,84,184,0.25)]"
                        : "text-slate-400 hover:bg-white/[0.05] hover:text-white",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: Version Badge + Collapse */}
      <div className="px-3 pb-4">
        {!collapsed && (
          <div className="flex items-center gap-3 rounded-xl bg-slate-800/50 border border-white/[0.06] px-3 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#120774] to-[#4454b8] text-white text-xs font-bold shadow-lg">
              BD
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-white truncate">Business Dev CRM</div>
              <div className="text-[10px] text-slate-500">Version 1.0</div>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="text-slate-500 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
