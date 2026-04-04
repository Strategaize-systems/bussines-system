"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Kanban,
  Settings,
  ChevronLeft,
  Handshake,
  ListTodo,
  Mail,
  FileText,
  GitBranch,
  ArrowRightLeft,
  Sun,
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
    label: "",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Mein Tag", href: "/mein-tag", icon: Sun },
    ],
  },
  {
    label: "CRM",
    items: [
      { name: "Kontakte", href: "/contacts", icon: Users },
      { name: "Firmen", href: "/companies", icon: Building2 },
      { name: "Multiplikatoren", href: "/multiplikatoren", icon: Handshake },
    ],
  },
  {
    label: "Pipeline",
    items: [
      { name: "Multiplikatoren", href: "/pipeline/multiplikatoren", icon: Kanban },
      { name: "Unternehmer", href: "/pipeline/unternehmer", icon: Kanban },
    ],
  },
  {
    label: "Operativ",
    items: [
      { name: "Aufgaben", href: "/aufgaben", icon: ListTodo },
      { name: "E-Mails", href: "/emails", icon: Mail },
      { name: "Angebote", href: "/proposals", icon: FileText },
      { name: "Empfehlungen", href: "/referrals", icon: GitBranch },
      { name: "Übergaben", href: "/handoffs", icon: ArrowRightLeft },
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
        collapsed ? "w-16" : "w-60"
      )}
      style={{ background: "linear-gradient(to bottom, #0f172a, #0f172a, #020617)" }}
    >
      {/* Logo Block */}
      <div className={cn("mx-3 mt-3 rounded-xl bg-gradient-to-b from-slate-800/80 to-slate-900/50 border border-white/[0.06]", collapsed ? "px-2 py-3" : "px-5 py-5 text-center")}>
        {!collapsed ? (
          <div className="mx-auto w-fit rounded-2xl bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-full.png" alt="StrategAIze" className="h-12 w-auto" />
          </div>
        ) : (
          <div className="mx-auto w-fit rounded-xl bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-symbol.png" alt="S" className="h-6 w-6" />
          </div>
        )}
      </div>

      {/* Title Block */}
      <div className={cn("mx-3 mt-2 rounded-xl bg-gradient-to-b from-slate-800/80 to-slate-900/50 border border-white/[0.06]", collapsed ? "hidden" : "px-5 py-3 text-center")}>
        <div className="text-sm font-bold text-white">Business Development</div>
        <div className="text-[11px] text-slate-500 mt-0.5">Revenue & Relationship System</div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mt-2 text-slate-500 hover:text-white transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5 mx-auto" />
        </button>
      </div>
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-2 text-slate-500 hover:text-white transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label || "root"}>
            {group.label && !collapsed && (
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {group.label}
              </div>
            )}
            {collapsed && group.label && (
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
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-r from-[#4454b8] to-[#120774] text-white shadow-[0_8px_16px_-4px_rgba(68,84,184,0.35)]"
                        : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-200",
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

      {/* Settings Footer */}
      <div className="px-3 pb-3">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200",
            pathname === "/settings"
              ? "bg-gradient-to-r from-[#4454b8] to-[#120774] text-white"
              : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-200",
            collapsed && "justify-center px-2"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>
    </aside>
  );
}
