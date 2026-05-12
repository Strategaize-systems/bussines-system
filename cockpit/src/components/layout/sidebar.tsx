"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { signout } from "@/app/(auth)/login/actions";
import type { Role } from "@/lib/auth/types";
import {
  filterByRole,
  groupVisualMerged,
  type SidebarItem,
} from "@/lib/navigation/sidebar-config";

/**
 * V7 Sidebar (SLC-702 MT-3).
 *
 * - Liest aus `SIDEBAR_CONFIG`, filtert per `role`-Prop (DEC-190).
 * - Server-Side-Filter: `role` kommt aus dem (app)/layout.tsx das via
 *   `await getProfile()` resolved wird. Kein Client-Flash, kein useEffect.
 * - Gruppiert via `groupVisualMerged` damit VERWALTUNG_MEIN + _SETUP unter
 *   einem "VERWALTUNG"-Header rendern (Split kommt in SLC-707).
 * - Sections ohne sichtbare Items werden komplett ausgeblendet.
 */

const COLLAPSIBLE_SECTIONS = new Set(["ARBEITSBEREICHE", "VERWALTUNG"]);
const DEFAULT_COLLAPSED_SECTIONS = new Set(["VERWALTUNG"]);

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const groups = useMemo(() => groupVisualMerged(filterByRole(role)), [role]);

  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {};
    for (const group of groups) {
      if (COLLAPSIBLE_SECTIONS.has(group.label)) {
        const isActiveInGroup = group.items.some((item) =>
          isPathnameActive(pathname, item.href),
        );
        state[group.label] =
          isActiveInGroup || !DEFAULT_COLLAPSED_SECTIONS.has(group.label);
      }
    }
    return state;
  });

  const toggleGroup = (label: string) => {
    setGroupOpen((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const renderItem = (item: SidebarItem) => {
    const isActive = isItemActive(pathname, item.href);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
          isActive
            ? "bg-gradient-to-r from-[#4454b8] to-[#120774] text-white shadow-[0_10px_15px_-3px_rgba(68,84,184,0.25)]"
            : "text-slate-400 hover:bg-white/[0.05] hover:text-white",
          collapsed && "justify-center px-2",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  };

  const renderGroup = (group: (typeof groups)[number]) => {
    const isCollapsible = COLLAPSIBLE_SECTIONS.has(group.label);

    if (isCollapsible && !collapsed) {
      const isOpen =
        groupOpen[group.label] ?? !DEFAULT_COLLAPSED_SECTIONS.has(group.label);
      return (
        <div key={group.key}>
          <button
            onClick={() => toggleGroup(group.label)}
            className="flex w-full items-center gap-1 px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-400 transition-colors"
          >
            {isOpen ? (
              <ChevronDown className="h-3 w-3 shrink-0" />
            ) : (
              <ChevronRight className="h-3 w-3 shrink-0" />
            )}
            <span>{group.label}</span>
          </button>
          {isOpen && (
            <div className="space-y-0.5">{group.items.map(renderItem)}</div>
          )}
        </div>
      );
    }

    return (
      <div key={group.key}>
        {!collapsed && (
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {group.label}
          </div>
        )}
        {collapsed && <div className="mx-auto my-2 h-px w-6 bg-white/10" />}
        <div className="space-y-0.5">{group.items.map(renderItem)}</div>
      </div>
    );
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-30 flex h-screen flex-col transition-all duration-300 max-md:hidden",
        collapsed ? "w-16" : "w-64",
      )}
      style={{
        background: "linear-gradient(to bottom, #0f172a, #0f172a, #020617)",
      }}
      data-testid="sidebar"
      data-role={role}
    >
      {/* Logo Block */}
      <div className={cn("mx-3 mt-4 mb-2", collapsed ? "px-1" : "px-3")}>
        {!collapsed ? (
          <div className="rounded-2xl bg-white p-4 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-full.png"
              alt="StrategAIze"
              className="h-10 w-auto"
            />
          </div>
        ) : (
          <div className="mx-auto w-fit rounded-xl bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-symbol.png" alt="S" className="h-6 w-6" />
          </div>
        )}
      </div>

      {/* Collapse Toggle (collapsed mode shows expand button at top) */}
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
        {groups.map(renderGroup)}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 space-y-2">
        {!collapsed && (
          <>
            <form action={signout}>
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium text-slate-400 hover:bg-white/[0.05] hover:text-white transition-all duration-200"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Ausloggen</span>
              </button>
            </form>

            <div className="flex items-center gap-3 rounded-xl bg-slate-800/50 border border-white/[0.06] px-3 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#120774] to-[#4454b8] text-white text-xs font-bold shadow-lg">
                BD
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-white truncate">
                  Business Dev CRM
                </div>
                <div className="text-[10px] text-slate-500">Version 1.0</div>
              </div>
              <button
                onClick={() => setCollapsed(true)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}
        {collapsed && (
          <form action={signout}>
            <button
              type="submit"
              className="mx-auto flex items-center justify-center w-10 h-10 rounded-lg text-slate-500 hover:bg-white/[0.05] hover:text-white transition-all"
              title="Ausloggen"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
    </aside>
  );
}

/**
 * Active-Highlight-Pruefung. Exact match plus Prefix-Variants.
 * - /dashboard ist Sonderfall: nur Exact, da viele Routes /dashboard nicht
 *   als Praefix nutzen (war im V6.6-Original auch so).
 */
export function isItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/dashboard") return false;
  return pathname.startsWith(href + "/") || pathname.startsWith(href + "?");
}

function isPathnameActive(pathname: string, href: string): boolean {
  return isItemActive(pathname, href);
}
