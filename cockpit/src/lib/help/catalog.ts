import type { Role } from "@/lib/auth/types";

/**
 * V8.3 SLC-826 Hilfe-Section — Single-Source-of-Truth fuer die /help-Tile-Page
 * und /help/[slug]-Detail-Pages.
 *
 * Reihenfolge analog `deliverables/user-guide/INDEX.md` (RPT-510): Erste Schritte
 * (4) -> Verwaltung (2) -> KI-Werkzeuge (3) -> Spezial-Themen (3).
 *
 * Markdown-Content liegt unter `cockpit/src/content/help/<slug>.md`. Pflicht-
 * Invariante (im Catalog-Test verifiziert): zu jedem Slug existiert ein File.
 */

export type HelpSection =
  | "erste-schritte"
  | "verwaltung"
  | "ki-werkzeuge"
  | "spezial";

export interface HelpSectionMeta {
  id: HelpSection;
  label: string;
  description: string;
  order: number;
}

export const HELP_SECTIONS: readonly HelpSectionMeta[] = [
  {
    id: "erste-schritte",
    label: "Erste Schritte",
    description: "Grundlagen fuer jede Rolle.",
    order: 1,
  },
  {
    id: "verwaltung",
    label: "Verwaltung",
    description: "Fuer Admin und Teamlead.",
    order: 2,
  },
  {
    id: "ki-werkzeuge",
    label: "KI-Werkzeuge",
    description: "Optional, aber sehr empfohlen.",
    order: 3,
  },
  {
    id: "spezial",
    label: "Spezial-Themen",
    description: "Bei Bedarf.",
    order: 4,
  },
];

export interface HelpGuide {
  slug: string;
  title: string;
  section: HelpSection;
  durationMinutes: number;
  /** Non-empty Liste der Rollen, die diesen Guide sehen sollen. */
  roles: readonly [Role, ...Role[]];
}

const ALL_ROLES: readonly [Role, Role, Role] = ["admin", "teamlead", "member"];
const ADMIN_TEAMLEAD: readonly [Role, Role] = ["admin", "teamlead"];
const ADMIN_ONLY: readonly [Role] = ["admin"];

export const HELP_CATALOG: readonly HelpGuide[] = [
  // Erste Schritte
  {
    slug: "mein-tag",
    title: "Mein Tag — Ihre tagliche Vertriebsroutine",
    section: "erste-schritte",
    durationMinutes: 10,
    roles: ALL_ROLES,
  },
  {
    slug: "pipeline",
    title: "Pipeline — Vertriebs-Steuerung per Drag&Drop",
    section: "erste-schritte",
    durationMinutes: 10,
    roles: ALL_ROLES,
  },
  {
    slug: "deal-detail",
    title: "Deal-Detail — Alle Infos zu einem Lead an einem Ort",
    section: "erste-schritte",
    durationMinutes: 10,
    roles: ALL_ROLES,
  },
  {
    slug: "compose",
    title: "Compose-Studio — E-Mails schreiben mit KI",
    section: "erste-schritte",
    durationMinutes: 10,
    roles: ALL_ROLES,
  },
  // Verwaltung
  {
    slug: "settings",
    title: "Settings — System-Konfiguration",
    section: "verwaltung",
    durationMinutes: 8,
    roles: ADMIN_TEAMLEAD,
  },
  {
    slug: "team-verwaltung",
    title: "Team-Verwaltung — Mitglieder einladen und verwalten",
    section: "verwaltung",
    durationMinutes: 8,
    roles: ADMIN_TEAMLEAD,
  },
  // KI-Werkzeuge
  {
    slug: "ki-usage",
    title: "KI optimal nutzen — Master-Guide fuer alle KI-Features",
    section: "ki-werkzeuge",
    durationMinutes: 12,
    roles: ALL_ROLES,
  },
  {
    slug: "workflow-automation",
    title: "Workflow-Automation — Regeln, die fuer Sie arbeiten",
    section: "ki-werkzeuge",
    durationMinutes: 10,
    roles: ADMIN_ONLY,
  },
  {
    slug: "custom-reports",
    title: "Custom-Reports — Eigene KI-Berichts-Vorlagen",
    section: "ki-werkzeuge",
    durationMinutes: 8,
    roles: ALL_ROLES,
  },
  // Spezial-Themen
  {
    slug: "kampagnen",
    title: "Kampagnen + UTM-Tracking",
    section: "spezial",
    durationMinutes: 8,
    roles: ADMIN_ONLY,
  },
  {
    slug: "zahlungsbedingungen",
    title: "Zahlungsbedingungen + Pre-Call Briefing",
    section: "spezial",
    durationMinutes: 8,
    roles: ALL_ROLES,
  },
  {
    slug: "vat-reverse-charge",
    title: "Steuern: NL+DE-VAT + Reverse-Charge",
    section: "spezial",
    durationMinutes: 8,
    roles: ADMIN_ONLY,
  },
];

export function getHelpGuideBySlug(slug: string): HelpGuide | null {
  return HELP_CATALOG.find((g) => g.slug === slug) ?? null;
}

export function listHelpSlugs(): string[] {
  return HELP_CATALOG.map((g) => g.slug);
}

export interface HelpSectionGroup {
  meta: HelpSectionMeta;
  guides: HelpGuide[];
}

export function groupBySection(): HelpSectionGroup[] {
  return [...HELP_SECTIONS]
    .sort((a, b) => a.order - b.order)
    .map((meta) => ({
      meta,
      guides: HELP_CATALOG.filter((g) => g.section === meta.id),
    }));
}

/**
 * UI-Label fuer Rollen-Badge auf der Tile-Page. Eindeutiges Mapping aus den
 * 3 gueltigen Rollen-Kombinationen im Catalog (alle / admin+teamlead / admin).
 */
export function rolesBadgeLabel(roles: readonly Role[]): string {
  const set = new Set(roles);
  if (set.has("admin") && set.has("teamlead") && set.has("member")) {
    return "Alle Rollen";
  }
  if (set.has("admin") && set.has("teamlead") && !set.has("member")) {
    return "Admin, Teamlead";
  }
  if (set.has("admin") && !set.has("teamlead") && !set.has("member")) {
    return "Admin";
  }
  return roles.join(", ");
}
