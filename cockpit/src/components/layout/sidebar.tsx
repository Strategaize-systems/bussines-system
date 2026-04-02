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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
        "fixed left-0 top-0 z-30 flex h-screen flex-col gradient-sidebar text-white transition-all duration-200",
        collapsed ? "w-16" : "w-60",
        "max-md:hidden"
      )}
    >
      {/* Logo / Brand */}
      <div className="flex h-14 items-center border-b border-white/10 px-4">
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight gradient-text-success">
            Strategaize
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn("ml-auto h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10", collapsed && "mx-auto")}
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label || "root"}>
            {group.label && !collapsed && (
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {group.label}
              </div>
            )}
            {collapsed && group.label && (
              <div className="mx-auto my-1 h-px w-8 bg-white/10" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                const linkContent = (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "gradient-primary text-white shadow-lg"
                        : "text-slate-400 hover:text-white hover:bg-white/5",
                      collapsed && "justify-center px-2"
                    )}
                    style={isActive ? { boxShadow: "0 10px 15px -3px rgba(68, 84, 184, 0.25)" } : undefined}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger render={<div />}>
                        {linkContent}
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.name}</TooltipContent>
                    </Tooltip>
                  );
                }

                return <div key={item.href}>{linkContent}</div>;
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings Footer */}
      <div className="border-t border-white/10 p-2">
        {(() => {
          const isActive = pathname === "/settings";
          const linkContent = (
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive
                  ? "gradient-primary text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/5",
                collapsed && "justify-center px-2"
              )}
            >
              <Settings className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Settings</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip>
                <TooltipTrigger render={<div />}>
                  {linkContent}
                </TooltipTrigger>
                <TooltipContent side="right">Settings</TooltipContent>
              </Tooltip>
            );
          }

          return linkContent;
        })()}
      </div>
    </aside>
  );
}
