import {
  LayoutDashboard,
  Users,
  Building2,
  Handshake,
  TrendingUp,
  CheckSquare,
  Calendar,
  Sparkles,
  Mail,
  FileText,
  ArrowRightLeft,
  Award,
  Settings,
  Shield,
  Briefcase,
  Target,
  Package,
  Zap,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/auth/types";

/**
 * V7 Sidebar-Single-Source-of-Truth (DEC-190).
 *
 * Server-Side-Filter im (app)/layout.tsx liest dieses Array und filtert nach
 * `profile.role`. Kein Client-Flash, kein useEffect-Filter.
 *
 * Reihenfolge: ANALYSE → TEAM → OPERATIV → ARBEITSBEREICHE → VERWALTUNG_*
 *
 * Admin-Sicht = V6.6-1:1 plus die 2 TEAM-Stubs (Risk R1: Visual-Diff via
 * Playwright validiert keine Regression in Admin-Layout).
 */

export type SidebarSection =
  | "ANALYSE"
  | "TEAM"
  | "OPERATIV"
  | "ARBEITSBEREICHE"
  | "VERWALTUNG_MEIN"
  | "VERWALTUNG_SETUP";

export const SECTION_LABEL: Record<SidebarSection, string> = {
  ANALYSE: "ANALYSE",
  TEAM: "TEAM",
  OPERATIV: "OPERATIV",
  ARBEITSBEREICHE: "ARBEITSBEREICHE",
  // VERWALTUNG-Split kommt erst in SLC-707 visuell — bis dahin werden beide
  // Sub-Sections unter einem Label "VERWALTUNG" gerendert.
  VERWALTUNG_MEIN: "VERWALTUNG",
  VERWALTUNG_SETUP: "VERWALTUNG",
};

export const SECTION_ORDER: SidebarSection[] = [
  "ANALYSE",
  "TEAM",
  "OPERATIV",
  "ARBEITSBEREICHE",
  "VERWALTUNG_MEIN",
  "VERWALTUNG_SETUP",
];

export interface SidebarItem {
  href: string;
  label: string;
  icon: LucideIcon;
  section: SidebarSection;
  /**
   * Non-empty Liste der Rollen die diesen Eintrag sehen duerfen.
   * Filter erfolgt server-side im Layout.
   */
  visibleFor: readonly [Role, ...Role[]];
}

const ALL_ROLES: readonly [Role, Role, Role] = ["admin", "teamlead", "member"];
const ADMIN_TEAMLEAD: readonly [Role, Role] = ["admin", "teamlead"];
const ADMIN_ONLY: readonly [Role] = ["admin"];

export const SIDEBAR_CONFIG: readonly SidebarItem[] = [
  // ANALYSE — admin + teamlead. V6.6 hat Dashboard zu KI-Analyse-Cockpit
  // umgebaut (FEAT-666). Member sieht das nicht (DEC-185 KI-Workspace auf
  // /mein-tag fuer Member).
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    section: "ANALYSE",
    visibleFor: ADMIN_TEAMLEAD,
  },

  // TEAM — V7-NEU. Stubs in SLC-702; UIs in SLC-703 (Verwaltung) und
  // SLC-705 (Cockpit).
  {
    href: "/team",
    label: "Team-Cockpit",
    icon: Users,
    section: "TEAM",
    visibleFor: ADMIN_TEAMLEAD,
  },
  {
    href: "/settings/team",
    label: "Team-Verwaltung",
    icon: UserCog,
    section: "TEAM",
    visibleFor: ADMIN_TEAMLEAD,
  },

  // OPERATIV — alle Rollen.
  {
    href: "/mein-tag",
    label: "Mein Tag",
    icon: Sparkles,
    section: "OPERATIV",
    visibleFor: ALL_ROLES,
  },
  {
    href: "/focus",
    label: "Focus",
    icon: Target,
    section: "OPERATIV",
    visibleFor: ALL_ROLES,
  },
  {
    href: "/kalender",
    label: "Kalender",
    icon: Calendar,
    section: "OPERATIV",
    visibleFor: ALL_ROLES,
  },

  // ARBEITSBEREICHE — alle Rollen (Owner-Filter erfolgt in SLC-704 in den
  // Server Actions, nicht im Sidebar-Layer).
  {
    href: "/deals",
    label: "Deals",
    icon: Briefcase,
    section: "ARBEITSBEREICHE",
    visibleFor: ALL_ROLES,
  },
  {
    href: "/pipeline/multiplikatoren",
    label: "Pipeline",
    icon: TrendingUp,
    section: "ARBEITSBEREICHE",
    visibleFor: ALL_ROLES,
  },
  {
    href: "/companies",
    label: "Firmen",
    icon: Building2,
    section: "ARBEITSBEREICHE",
    visibleFor: ALL_ROLES,
  },
  {
    href: "/contacts",
    label: "Kontakte",
    icon: Users,
    section: "ARBEITSBEREICHE",
    visibleFor: ALL_ROLES,
  },
  {
    href: "/multiplikatoren",
    label: "Multiplikatoren",
    icon: Handshake,
    section: "ARBEITSBEREICHE",
    visibleFor: ALL_ROLES,
  },

  // VERWALTUNG_MEIN — eigene operative Listen + Settings (Member sieht seine
  // eigenen Owner-Records via RLS).
  {
    href: "/aufgaben",
    label: "Aufgaben",
    icon: CheckSquare,
    section: "VERWALTUNG_MEIN",
    visibleFor: ALL_ROLES,
  },
  {
    href: "/termine",
    label: "Termine-Liste",
    icon: Calendar,
    section: "VERWALTUNG_MEIN",
    visibleFor: ALL_ROLES,
  },
  {
    href: "/emails",
    label: "E-Mails",
    icon: Mail,
    section: "VERWALTUNG_MEIN",
    visibleFor: ALL_ROLES,
  },
  {
    href: "/proposals",
    label: "Proposals",
    icon: FileText,
    section: "VERWALTUNG_MEIN",
    visibleFor: ALL_ROLES,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    section: "VERWALTUNG_MEIN",
    visibleFor: ALL_ROLES,
  },

  // VERWALTUNG_SETUP — managerial Tools, admin/teamlead-only.
  {
    href: "/handoffs",
    label: "Handoffs",
    icon: ArrowRightLeft,
    section: "VERWALTUNG_SETUP",
    visibleFor: ADMIN_TEAMLEAD,
  },
  {
    href: "/referrals",
    label: "Referrals",
    icon: Award,
    section: "VERWALTUNG_SETUP",
    visibleFor: ADMIN_TEAMLEAD,
  },
  {
    href: "/performance/goals",
    label: "Ziele",
    icon: Target,
    section: "VERWALTUNG_SETUP",
    visibleFor: ADMIN_TEAMLEAD,
  },
  {
    href: "/cadences",
    label: "Automatisierung",
    icon: Zap,
    section: "VERWALTUNG_SETUP",
    visibleFor: ADMIN_TEAMLEAD,
  },
  {
    href: "/settings/products",
    label: "Produkte",
    icon: Package,
    section: "VERWALTUNG_SETUP",
    visibleFor: ADMIN_ONLY,
  },
  {
    href: "/audit-log",
    label: "Audit-Log",
    icon: Shield,
    section: "VERWALTUNG_SETUP",
    visibleFor: ADMIN_ONLY,
  },
];

/**
 * Pure filter: returnt nur die Eintraege die `role` sehen darf, in der
 * SECTION_ORDER-Reihenfolge der `SIDEBAR_CONFIG`.
 */
export function filterByRole(role: Role): SidebarItem[] {
  return SIDEBAR_CONFIG.filter((item) => item.visibleFor.includes(role));
}

/**
 * Gruppiert eine Filter-Output-Liste nach Section. Section-Header die ohne
 * Items uebrig bleiben werden im Sidebar-Component ausgeblendet.
 */
export function groupBySection(
  items: SidebarItem[],
): Array<{ section: SidebarSection; label: string; items: SidebarItem[] }> {
  const groups = new Map<SidebarSection, SidebarItem[]>();
  for (const item of items) {
    const bucket = groups.get(item.section) ?? [];
    bucket.push(item);
    groups.set(item.section, bucket);
  }
  return SECTION_ORDER.filter((s) => groups.has(s)).map((section) => ({
    section,
    label: SECTION_LABEL[section],
    items: groups.get(section)!,
  }));
}

/**
 * Visual-Merge: VERWALTUNG_MEIN + VERWALTUNG_SETUP haben aktuell dasselbe
 * Label "VERWALTUNG". `groupVisualMerged` kollabiert beide Sections in eine
 * einzelne "VERWALTUNG"-Gruppe — bis SLC-707 die Sub-Headers implementiert.
 */
export function groupVisualMerged(
  items: SidebarItem[],
): Array<{ key: string; label: string; items: SidebarItem[] }> {
  const groups = groupBySection(items);
  const merged: Array<{ key: string; label: string; items: SidebarItem[] }> = [];
  for (const g of groups) {
    const last = merged[merged.length - 1];
    if (last && last.label === g.label) {
      last.items.push(...g.items);
    } else {
      merged.push({ key: g.section, label: g.label, items: [...g.items] });
    }
  }
  return merged;
}
