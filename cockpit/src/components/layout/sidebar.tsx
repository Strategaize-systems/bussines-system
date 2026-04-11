"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Handshake,
  TrendingUp,
  CheckSquare,
  Calendar,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Mail,
  FileText,
  ArrowRightLeft,
  Award,
  Settings,
  Shield,
  Briefcase,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

type NavItem = {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  children?: { name: string; href: string }[];
};

type NavGroup = {
  label: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "OPERATIV",
    items: [
      { name: "Mein Tag", href: "/mein-tag", icon: Sparkles },
      { name: "Focus", href: "/focus", icon: Target },
    ],
  },
  {
    label: "WORKSPACES",
    items: [
      { name: "Alle Deals", href: "/deals", icon: Briefcase },
      { name: "Pipeline", href: "/pipeline/multiplikatoren", icon: TrendingUp },
      { name: "Alle Firmen", href: "/companies", icon: Building2 },
      { name: "Alle Kontakte", href: "/contacts", icon: Users },
      { name: "Multiplikatoren", href: "/multiplikatoren", icon: Handshake },
    ],
  },
  {
    label: "ANALYSE",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "VERWALTUNG",
    collapsible: true,
    defaultCollapsed: true,
    items: [
      { name: "Aufgaben", href: "/aufgaben", icon: CheckSquare },
      { name: "Termine", href: "/termine", icon: Calendar },
      { name: "E-Mails", href: "/emails", icon: Mail },
      { name: "Proposals", href: "/proposals", icon: FileText },
      { name: "Handoffs", href: "/handoffs", icon: ArrowRightLeft },
      { name: "Referrals", href: "/referrals", icon: Award },
      { name: "Settings", href: "/settings", icon: Settings },
      { name: "Audit-Log", href: "/audit-log", icon: Shield },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedPipeline, setExpandedPipeline] = useState(
    () => pathname.startsWith("/pipeline")
  );
  const [verwaltungOpen, setVerwaltungOpen] = useState(() => {
    // Auto-open Verwaltung if current route is inside it
    const verwaltungPaths = ["/aufgaben", "/termine", "/emails", "/proposals", "/handoffs", "/referrals", "/settings", "/audit-log"];
    return verwaltungPaths.some((p) => pathname.startsWith(p));
  });

  const isItemActive = (item: NavItem) => {
    if (item.children) {
      return item.children.some((child) => pathname === child.href || pathname.startsWith(child.href));
    }
    return (
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href))
    );
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = isItemActive(item);

    // Item with sub-navigation (Pipeline)
    if (item.children && !collapsed) {
      const isChildActive = item.children.some(
        (child) => pathname === child.href || pathname.startsWith(child.href)
      );

      return (
        <div key={item.href}>
          <button
            onClick={() => setExpandedPipeline(!expandedPipeline)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
              isChildActive
                ? "bg-gradient-to-r from-[#4454b8] to-[#120774] text-white shadow-[0_10px_15px_-3px_rgba(68,84,184,0.25)]"
                : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">{item.name}</span>
            {expandedPipeline ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
            )}
          </button>
          {expandedPipeline && (
            <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
              {item.children.map((child) => {
                const childActive =
                  pathname === child.href || pathname.startsWith(child.href);
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={cn(
                      "block rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-all duration-200",
                      childActive
                        ? "text-white bg-white/10"
                        : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"
                    )}
                  >
                    {child.name}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Collapsed mode with children — just show icon linking to first child
    if (item.children && collapsed) {
      return (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 justify-center px-2",
            isActive
              ? "bg-gradient-to-r from-[#4454b8] to-[#120774] text-white shadow-[0_10px_15px_-3px_rgba(68,84,184,0.25)]"
              : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
        </Link>
      );
    }

    // Standard nav item
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
  };

  const renderGroup = (group: NavGroup) => {
    // Collapsible group (Verwaltung)
    if (group.collapsible && !collapsed) {
      return (
        <div key={group.label}>
          <button
            onClick={() => setVerwaltungOpen(!verwaltungOpen)}
            className="flex w-full items-center gap-1 px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-400 transition-colors"
          >
            {verwaltungOpen ? (
              <ChevronDown className="h-3 w-3 shrink-0" />
            ) : (
              <ChevronRight className="h-3 w-3 shrink-0" />
            )}
            <span>{group.label}</span>
          </button>
          {verwaltungOpen && (
            <div className="space-y-0.5">
              {group.items.map((item) => renderNavItem(item))}
            </div>
          )}
        </div>
      );
    }

    // Standard group
    return (
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
          {group.items.map((item) => renderNavItem(item))}
        </div>
      </div>
    );
  };

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
        {navGroups.map((group) => renderGroup(group))}
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
