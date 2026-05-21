import {
  Bell,
  FileText,
  Palette,
  Receipt,
  Zap,
  Megaphone,
  GitBranch,
  Mail,
  Clock,
  Package,
  History,
  Users,
  Target,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/auth/types";

export interface SettingsTile {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  iconWrapperClasses: string;
  iconClasses: string;
  visibleFor: readonly [Role, ...Role[]];
}

export interface SettingsSection {
  key: "personal" | "sales" | "system";
  title: string;
  description: string;
  tiles: readonly SettingsTile[];
}

const ALL_ROLES: readonly [Role, Role, Role] = ["admin", "teamlead", "member"];
const ADMIN_TEAMLEAD: readonly [Role, Role] = ["admin", "teamlead"];
const ADMIN_ONLY: readonly [Role] = ["admin"];

// V8 DEC-219: 3-Section-Struktur (Persoenlich / Vertrieb / System).
// SLC-711 DEC-196: Permission-Matrix dreistufig (Admin / Admin+Teamlead / Alle).
// SLC-823 DEC-229: Rollen-Verwaltung-Tile auf ADMIN_TEAMLEAD erweitert, damit
// Teamlead die Seite auch ueber die Tile-Page findet (nicht nur Sidebar).
export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  {
    key: "personal",
    title: "Persoenlich",
    description: "Persoenliche Voreinstellungen fuer Arbeitszeit und Meetings",
    tiles: [
      {
        href: "/settings/working-hours",
        label: "Arbeitszeit",
        description: "Start- und End-Zeit fuer Kalender-Working-Hours-Filter",
        icon: Clock,
        iconWrapperClasses: "bg-blue-50",
        iconClasses: "text-blue-700",
        visibleFor: ALL_ROLES,
      },
      {
        href: "/settings/meetings",
        label: "Meeting-Einstellungen",
        description: "Erinnerungen, Kalender und KI-Agenda",
        icon: Bell,
        iconWrapperClasses: "bg-orange-50",
        iconClasses: "text-orange-600",
        visibleFor: ALL_ROLES,
      },
      {
        href: "/settings/briefing",
        label: "Pre-Call Briefing",
        description: "Push-Notifications und Inhalt des Pre-Call-Briefings",
        icon: Bell,
        iconWrapperClasses: "bg-yellow-50",
        iconClasses: "text-yellow-700",
        visibleFor: ALL_ROLES,
      },
    ],
  },
  {
    key: "sales",
    title: "Vertrieb",
    description: "Pipelines, Automation und Vertriebsvorlagen",
    tiles: [
      {
        href: "/settings/pipelines",
        label: "Pipelines & Stages",
        description:
          "Pipelines anlegen, Stages konfigurieren und Reihenfolge festlegen",
        icon: GitBranch,
        iconWrapperClasses: "bg-indigo-50",
        iconClasses: "text-indigo-700",
        visibleFor: ADMIN_ONLY,
      },
      {
        href: "/settings/automation",
        label: "Workflow-Automation",
        description:
          "Wenn-Dann-Regeln fuer Routine-Reaktionen (Stage-Change, Activity, Deal-Create)",
        icon: Zap,
        iconWrapperClasses: "bg-amber-50",
        iconClasses: "text-amber-600",
        visibleFor: ADMIN_TEAMLEAD,
      },
      {
        href: "/settings/workflow-automation/nl-history",
        label: "NL-Regel-Historie",
        description:
          "Audit-Log der KI-Sculpt-Aufrufe fuer Workflow-Regeln (Inspection)",
        icon: History,
        iconWrapperClasses: "bg-amber-50",
        iconClasses: "text-amber-700",
        visibleFor: ADMIN_ONLY,
      },
      {
        href: "/settings/campaigns",
        label: "Kampagnen",
        description:
          "Kampagnen-Verwaltung mit Tracking-Links + Performance-KPIs (Klicks, Leads, Deals, Conversion-Rate)",
        icon: Megaphone,
        iconWrapperClasses: "bg-sky-50",
        iconClasses: "text-sky-600",
        visibleFor: ADMIN_TEAMLEAD,
      },
      {
        href: "/settings/templates",
        label: "E-Mail-Templates",
        description: "Mehrsprachige Vorlagen fuer ausgehende E-Mails (DE / NL / EN)",
        icon: Mail,
        iconWrapperClasses: "bg-cyan-50",
        iconClasses: "text-cyan-700",
        visibleFor: ADMIN_TEAMLEAD,
      },
    ],
  },
  {
    key: "system",
    title: "System",
    description: "Branding, Compliance und Stammdaten-Verwaltung",
    tiles: [
      {
        href: "/settings/branding",
        label: "Branding",
        description: "Logo, Farben, Schrift und Footer fuer ausgehende Mails",
        icon: Palette,
        iconWrapperClasses: "bg-violet-50",
        iconClasses: "text-violet-700",
        visibleFor: ADMIN_ONLY,
      },
      {
        href: "/settings/payment-terms",
        label: "Zahlungsbedingungen",
        description: "Vorlagen fuer Angebote (Default + Custom-Templates)",
        icon: Receipt,
        iconWrapperClasses: "bg-emerald-50",
        iconClasses: "text-emerald-700",
        visibleFor: ADMIN_ONLY,
      },
      {
        href: "/settings/compliance",
        label: "Einwilligungstexte",
        description: "DSGVO-Standardvorlagen fuer Meeting, E-Mail und Cal.com",
        icon: FileText,
        iconWrapperClasses: "bg-rose-50",
        iconClasses: "text-rose-700",
        visibleFor: ADMIN_ONLY,
      },
      {
        href: "/settings/products",
        label: "Produkte",
        description: "Produkt-Katalog fuer Goals und Forecast-Auswahl",
        icon: Package,
        iconWrapperClasses: "bg-teal-50",
        iconClasses: "text-teal-700",
        visibleFor: ADMIN_ONLY,
      },
      {
        href: "/settings/team",
        label: "Rollen-Verwaltung",
        description: "Team-Mitglieder einsehen und verwalten",
        icon: Users,
        iconWrapperClasses: "bg-slate-100",
        iconClasses: "text-slate-700",
        visibleFor: ADMIN_TEAMLEAD,
      },
      {
        href: "/settings/goals",
        label: "Ziele",
        description: "Vertriebsziele verwalten, importieren und KPIs pflegen",
        icon: Target,
        iconWrapperClasses: "bg-orange-50",
        iconClasses: "text-orange-600",
        visibleFor: ADMIN_TEAMLEAD,
      },
    ],
  },
];

/**
 * Pure filter: returnt nur die Sections die mindestens einen Tile fuer `role`
 * enthalten, mit der Tile-Liste auf sichtbare reduziert.
 */
export function filterVisibleSections(
  role: Role,
): Array<SettingsSection & { tiles: readonly SettingsTile[] }> {
  return SETTINGS_SECTIONS.map((section) => ({
    ...section,
    tiles: section.tiles.filter((t) => t.visibleFor.includes(role)),
  })).filter((section) => section.tiles.length > 0);
}
