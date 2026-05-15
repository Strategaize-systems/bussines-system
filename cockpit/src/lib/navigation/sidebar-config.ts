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
  Palette,
  Receipt,
  GitBranch,
  Megaphone,
  Clock,
  Bell,
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
  // SLC-707 MT-6: VERWALTUNG-Split mit Sub-Group-Headers. Der Top-Section-
  // Header "VERWALTUNG" wird in der Sidebar separat (parentLabel) gerendert,
  // diese Labels sind die Sub-Group-Header.
  VERWALTUNG_MEIN: "Mein Profil",
  VERWALTUNG_SETUP: "Setup",
};

/**
 * SLC-707 MT-6: Top-Section-Parent-Label fuer Sections die unter einem
 * gemeinsamen Top-Header gerendert werden. Sections ohne Parent rendern
 * direkt mit ihrem eigenen Label als Top-Header.
 */
export const SECTION_PARENT: Partial<Record<SidebarSection, string>> = {
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
  // SLC-711: persoenliche Settings-Sub-Pages (ALL_ROLES, sichtbar fuer
  // Member im Settings-Sub-Sidebar-Slug-Filter + global unter Mein Profil).
  {
    href: "/settings/working-hours",
    label: "Arbeitszeit",
    icon: Clock,
    section: "VERWALTUNG_MEIN",
    visibleFor: ALL_ROLES,
  },
  {
    href: "/settings/meetings",
    label: "Meeting-Einstellungen",
    icon: Calendar,
    section: "VERWALTUNG_MEIN",
    visibleFor: ALL_ROLES,
  },
  {
    href: "/settings/briefing",
    label: "Briefing",
    icon: Bell,
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
  // SLC-711: managerial Settings-Sub-Pages.
  // Admin-only (organisationsweite Tiefe): branding, payment-terms, pipelines,
  // products (existing), compliance. Admin+Teamlead (team-operativ): automation,
  // templates, campaigns. Permission-Matrix per DEC-196.
  {
    href: "/settings/branding",
    label: "Branding",
    icon: Palette,
    section: "VERWALTUNG_SETUP",
    visibleFor: ADMIN_ONLY,
  },
  {
    href: "/settings/payment-terms",
    label: "Zahlungsbedingungen",
    icon: Receipt,
    section: "VERWALTUNG_SETUP",
    visibleFor: ADMIN_ONLY,
  },
  {
    href: "/settings/pipelines",
    label: "Pipelines & Stages",
    icon: GitBranch,
    section: "VERWALTUNG_SETUP",
    visibleFor: ADMIN_ONLY,
  },
  {
    href: "/settings/products",
    label: "Produkte",
    icon: Package,
    section: "VERWALTUNG_SETUP",
    visibleFor: ADMIN_ONLY,
  },
  {
    href: "/settings/compliance",
    label: "Einwilligungstexte",
    icon: FileText,
    section: "VERWALTUNG_SETUP",
    visibleFor: ADMIN_ONLY,
  },
  {
    href: "/settings/automation",
    label: "Workflow-Automation",
    icon: Zap,
    section: "VERWALTUNG_SETUP",
    visibleFor: ADMIN_TEAMLEAD,
  },
  {
    href: "/settings/templates",
    label: "E-Mail-Templates",
    icon: Mail,
    section: "VERWALTUNG_SETUP",
    visibleFor: ADMIN_TEAMLEAD,
  },
  {
    href: "/settings/campaigns",
    label: "Kampagnen",
    icon: Megaphone,
    section: "VERWALTUNG_SETUP",
    visibleFor: ADMIN_TEAMLEAD,
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
 * SLC-707 MT-6: Visual-Split mit Sub-Group-Headers.
 *
 * Rendert eine zweistufige Struktur:
 * - Top-Sections wie ANALYSE / TEAM / OPERATIV / ARBEITSBEREICHE: 1 Gruppe ohne
 *   Sub-Groups (`subGroups.length === 1`, subGroup hat `label = null`).
 * - VERWALTUNG: 1 Top-Gruppe (`parentLabel = "VERWALTUNG"`) mit bis zu 2 Sub-
 *   Groups (`Mein Profil`, `Setup`).
 *
 * **Conditional Sub-Header (Muster 1, AC6):** Bei nur **einer** sichtbaren
 * Sub-Group fuer eine Rolle (Member-Fall: nur VERWALTUNG_MEIN) ist
 * `subGroup.label = null` — der Sub-Header wird nicht gerendert, Items
 * erscheinen direkt unter dem Top-Header. Bei ≥2 sichtbaren Sub-Groups
 * behalten alle Sub-Groups ihr Label.
 */
export interface SidebarSubGroup {
  /** Section-Key des ersten Sub-Group-Items (fuer React-keys). */
  key: SidebarSection;
  /** Sub-Group-Header-Label, oder `null` wenn unterdrueckt (Muster 1). */
  label: string | null;
  items: SidebarItem[];
}

export interface SidebarTopGroup {
  /** Eindeutiger Key fuer React (erste Section in der Gruppe). */
  key: string;
  /** Top-Section-Header-Label, immer sichtbar. */
  parentLabel: string;
  /** 1..N Sub-Groups. */
  subGroups: SidebarSubGroup[];
}

export function groupWithSubGroups(items: SidebarItem[]): SidebarTopGroup[] {
  const sectionGroups = groupBySection(items);
  const tops: SidebarTopGroup[] = [];

  for (const g of sectionGroups) {
    const parent = SECTION_PARENT[g.section] ?? g.label;
    const last = tops[tops.length - 1];

    if (last && last.parentLabel === parent && SECTION_PARENT[g.section]) {
      // Section hat denselben Parent wie die vorherige -> Sub-Group anhaengen
      last.subGroups.push({
        key: g.section,
        label: SECTION_LABEL[g.section],
        items: [...g.items],
      });
    } else {
      // Neue Top-Gruppe.
      const hasParent = !!SECTION_PARENT[g.section];
      tops.push({
        key: g.section,
        parentLabel: parent,
        subGroups: [
          {
            key: g.section,
            // Wenn Section keinen Parent hat, ist sie selbst der Top-Header
            // und braucht keinen separaten Sub-Header.
            label: hasParent ? SECTION_LABEL[g.section] : null,
            items: [...g.items],
          },
        ],
      });
    }
  }

  // Muster 1: Bei genau 1 sichtbarer Sub-Group -> Sub-Header unterdruecken.
  for (const top of tops) {
    if (top.subGroups.length === 1) {
      top.subGroups[0].label = null;
    }
  }

  return tops;
}

/**
 * @deprecated SLC-707 MT-6: ersetzt durch `groupWithSubGroups`. Bleibt fuer
 * etwaige Alt-Aufrufer als Flatten-Adapter erhalten (eine Gruppe pro Top).
 */
export function groupVisualMerged(
  items: SidebarItem[],
): Array<{ key: string; label: string; items: SidebarItem[] }> {
  return groupWithSubGroups(items).map((top) => ({
    key: top.key,
    label: top.parentLabel,
    items: top.subGroups.flatMap((sg) => sg.items),
  }));
}
