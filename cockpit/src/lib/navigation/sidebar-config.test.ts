import { describe, it, expect } from "vitest";
import {
  SIDEBAR_CONFIG,
  filterByRole,
  groupBySection,
  groupVisualMerged,
  SECTION_ORDER,
} from "./sidebar-config";
import type { Role } from "@/lib/auth/types";

describe("SIDEBAR_CONFIG", () => {
  it("contains baseline items after SLC-822 (>=21 items)", () => {
    expect(SIDEBAR_CONFIG.length).toBeGreaterThanOrEqual(21);
  });

  it("every item has a non-empty visibleFor", () => {
    for (const item of SIDEBAR_CONFIG) {
      expect(item.visibleFor.length).toBeGreaterThan(0);
    }
  });

  it("every item has a valid section", () => {
    for (const item of SIDEBAR_CONFIG) {
      expect(SECTION_ORDER).toContain(item.section);
    }
  });

  it("hrefs are unique", () => {
    const seen = new Set<string>();
    for (const item of SIDEBAR_CONFIG) {
      expect(seen.has(item.href)).toBe(false);
      seen.add(item.href);
    }
  });
});

describe("filterByRole — Role-Matrix", () => {
  it("admin sees every item (Admin = V6.6-Baseline + TEAM)", () => {
    const items = filterByRole("admin");
    expect(items.length).toBe(SIDEBAR_CONFIG.length);
  });

  it("teamlead sees ANALYSE + TEAM + OPERATIV + ARBEITSBEREICHE + VERWALTUNG + WERKZEUGE (ohne admin-only)", () => {
    const items = filterByRole("teamlead");
    const hrefs = items.map((i) => i.href);
    // Sichtbar:
    expect(hrefs).toContain("/dashboard");
    expect(hrefs).toContain("/team");
    expect(hrefs).toContain("/settings/team");
    expect(hrefs).toContain("/mein-tag");
    expect(hrefs).toContain("/deals");
    expect(hrefs).toContain("/handoffs");
    expect(hrefs).toContain("/referrals");
    // NICHT sichtbar (admin-only):
    expect(hrefs).not.toContain("/audit-log");
  });

  it("member sieht KEIN /dashboard, KEIN /team, KEIN WERKZEUGE-Item", () => {
    const items = filterByRole("member");
    const hrefs = items.map((i) => i.href);
    // Member-sichtbar:
    expect(hrefs).toContain("/mein-tag");
    expect(hrefs).toContain("/focus");
    expect(hrefs).toContain("/kalender");
    expect(hrefs).toContain("/deals");
    expect(hrefs).toContain("/pipeline/multiplikatoren");
    expect(hrefs).toContain("/companies");
    expect(hrefs).toContain("/contacts");
    expect(hrefs).toContain("/multiplikatoren");
    expect(hrefs).toContain("/aufgaben");
    expect(hrefs).toContain("/termine");
    expect(hrefs).toContain("/emails");
    expect(hrefs).toContain("/proposals");
    expect(hrefs).toContain("/settings");
    // Member-NICHT sichtbar:
    expect(hrefs).not.toContain("/dashboard");
    expect(hrefs).not.toContain("/team");
    expect(hrefs).not.toContain("/settings/team");
    expect(hrefs).not.toContain("/handoffs");
    expect(hrefs).not.toContain("/referrals");
    expect(hrefs).not.toContain("/audit-log");
  });

  it("member sees no ANALYSE-section items", () => {
    const items = filterByRole("member");
    expect(items.filter((i) => i.section === "ANALYSE")).toHaveLength(0);
  });

  it("member sees no TEAM-section items", () => {
    const items = filterByRole("member");
    expect(items.filter((i) => i.section === "TEAM")).toHaveLength(0);
  });

  it("member sees no WERKZEUGE-section items", () => {
    const items = filterByRole("member");
    expect(items.filter((i) => i.section === "WERKZEUGE")).toHaveLength(0);
  });
});

describe("filterByRole — Snapshots", () => {
  it("returns deterministic href-list per Role (snapshot)", () => {
    const snapshot: Record<Role, string[]> = {
      admin: filterByRole("admin").map((i) => `${i.section}:${i.href}`),
      teamlead: filterByRole("teamlead").map((i) => `${i.section}:${i.href}`),
      member: filterByRole("member").map((i) => `${i.section}:${i.href}`),
    };
    expect(snapshot).toMatchInlineSnapshot(`
      {
        "admin": [
          "ANALYSE:/dashboard",
          "TEAM:/team",
          "TEAM:/settings/team",
          "OPERATIV:/mein-tag",
          "OPERATIV:/focus",
          "OPERATIV:/kalender",
          "ARBEITSBEREICHE:/deals",
          "ARBEITSBEREICHE:/pipeline/multiplikatoren",
          "ARBEITSBEREICHE:/companies",
          "ARBEITSBEREICHE:/contacts",
          "ARBEITSBEREICHE:/multiplikatoren",
          "VERWALTUNG_MEIN:/aufgaben",
          "VERWALTUNG_MEIN:/termine",
          "VERWALTUNG_MEIN:/emails",
          "VERWALTUNG_MEIN:/proposals",
          "VERWALTUNG_MEIN:/settings",
          "VERWALTUNG_MEIN:/settings/working-hours",
          "VERWALTUNG_MEIN:/settings/meetings",
          "VERWALTUNG_MEIN:/settings/briefing",
          "WERKZEUGE:/handoffs",
          "WERKZEUGE:/referrals",
          "WERKZEUGE:/audit-log",
        ],
        "member": [
          "OPERATIV:/mein-tag",
          "OPERATIV:/focus",
          "OPERATIV:/kalender",
          "ARBEITSBEREICHE:/deals",
          "ARBEITSBEREICHE:/pipeline/multiplikatoren",
          "ARBEITSBEREICHE:/companies",
          "ARBEITSBEREICHE:/contacts",
          "ARBEITSBEREICHE:/multiplikatoren",
          "VERWALTUNG_MEIN:/aufgaben",
          "VERWALTUNG_MEIN:/termine",
          "VERWALTUNG_MEIN:/emails",
          "VERWALTUNG_MEIN:/proposals",
          "VERWALTUNG_MEIN:/settings",
          "VERWALTUNG_MEIN:/settings/working-hours",
          "VERWALTUNG_MEIN:/settings/meetings",
          "VERWALTUNG_MEIN:/settings/briefing",
        ],
        "teamlead": [
          "ANALYSE:/dashboard",
          "TEAM:/team",
          "TEAM:/settings/team",
          "OPERATIV:/mein-tag",
          "OPERATIV:/focus",
          "OPERATIV:/kalender",
          "ARBEITSBEREICHE:/deals",
          "ARBEITSBEREICHE:/pipeline/multiplikatoren",
          "ARBEITSBEREICHE:/companies",
          "ARBEITSBEREICHE:/contacts",
          "ARBEITSBEREICHE:/multiplikatoren",
          "VERWALTUNG_MEIN:/aufgaben",
          "VERWALTUNG_MEIN:/termine",
          "VERWALTUNG_MEIN:/emails",
          "VERWALTUNG_MEIN:/proposals",
          "VERWALTUNG_MEIN:/settings",
          "VERWALTUNG_MEIN:/settings/working-hours",
          "VERWALTUNG_MEIN:/settings/meetings",
          "VERWALTUNG_MEIN:/settings/briefing",
          "WERKZEUGE:/handoffs",
          "WERKZEUGE:/referrals",
        ],
      }
    `);
  });
});

describe("SLC-711 / SLC-822 — Persoenliche Settings-Sub-Pages (ALL_ROLES)", () => {
  // SLC-822 (DEC-228): Die managerial Settings-Sub-Pages (branding, pipelines,
  // payment-terms, compliance, automation, templates, campaigns, goals,
  // workflow-automation/nl-history) wurden aus der Sidebar entfernt — nur
  // erreichbar via /settings-Tile-Page. Die persoenlichen ALL_ROLES-Settings
  // bleiben unter VERWALTUNG_MEIN sichtbar.
  const SETTINGS_SUB_PAGES_ALL_ROLES = [
    "/settings/working-hours",
    "/settings/meetings",
    "/settings/briefing",
  ] as const;

  it("alle 3 persoenlichen Settings-Sub-Page-Items existieren in SIDEBAR_CONFIG", () => {
    const hrefs = SIDEBAR_CONFIG.map((i) => i.href);
    for (const sub of SETTINGS_SUB_PAGES_ALL_ROLES) {
      expect(hrefs).toContain(sub);
    }
  });

  it("alle Rollen sehen die 3 persoenlichen Settings-Sub-Pages", () => {
    for (const role of ["admin", "teamlead", "member"] as const) {
      const hrefs = filterByRole(role).map((i) => i.href);
      for (const sub of SETTINGS_SUB_PAGES_ALL_ROLES) {
        expect(hrefs).toContain(sub);
      }
    }
  });

  it("Member sieht NUR die 3 persoenlichen /settings/*-Pages (keine managerial Sub-Pages mehr)", () => {
    const memberSlugItems = filterByRole("member").filter((i) =>
      i.href.startsWith("/settings/"),
    );
    expect(memberSlugItems.length).toBe(3);
    expect(memberSlugItems.map((i) => i.href).sort()).toEqual(
      [...SETTINGS_SUB_PAGES_ALL_ROLES].sort(),
    );
  });

  it("Sidebar enthaelt keine der SLC-822-entfernten managerial Sub-Pages", () => {
    const hrefs = SIDEBAR_CONFIG.map((i) => i.href);
    const REMOVED_BY_SLC_822 = [
      "/settings/goals",
      "/cadences",
      "/settings/branding",
      "/settings/payment-terms",
      "/settings/pipelines",
      "/settings/products",
      "/settings/compliance",
      "/settings/automation",
      "/settings/workflow-automation/nl-history",
      "/settings/templates",
      "/settings/campaigns",
    ] as const;
    for (const removed of REMOVED_BY_SLC_822) {
      expect(hrefs).not.toContain(removed);
    }
  });
});

describe("groupBySection / groupVisualMerged", () => {
  it("groupBySection orders sections per SECTION_ORDER", () => {
    const groups = groupBySection(filterByRole("admin"));
    expect(groups.map((g) => g.section)).toEqual([
      "ANALYSE",
      "TEAM",
      "OPERATIV",
      "ARBEITSBEREICHE",
      "VERWALTUNG_MEIN",
      "WERKZEUGE",
    ]);
  });

  it("groupBySection skips sections without items (member sieht keine ANALYSE/TEAM/WERKZEUGE)", () => {
    const groups = groupBySection(filterByRole("member"));
    const sections = groups.map((g) => g.section);
    expect(sections).not.toContain("ANALYSE");
    expect(sections).not.toContain("TEAM");
    expect(sections).not.toContain("WERKZEUGE");
    expect(sections).toContain("OPERATIV");
    expect(sections).toContain("ARBEITSBEREICHE");
    expect(sections).toContain("VERWALTUNG_MEIN");
  });

  it("groupVisualMerged: VERWALTUNG enthaelt nur _MEIN-Items, WERKZEUGE ist eigene Top-Gruppe (Admin)", () => {
    // SLC-822 (DEC-228): _SETUP-Sub-Group wurde zur eigenen WERKZEUGE-Top-
    // Section umgebaut. VERWALTUNG hat post-V8.1 nur noch _MEIN-Items.
    const groups = groupVisualMerged(filterByRole("admin"));
    const labels = groups.map((g) => g.label);
    // VERWALTUNG taucht genau einmal auf (nur _MEIN-Sub-Group)
    expect(labels.filter((l) => l === "VERWALTUNG")).toHaveLength(1);
    // WERKZEUGE ist eigene Top-Gruppe
    expect(labels).toContain("WERKZEUGE");

    const verwGroup = groups.find((g) => g.label === "VERWALTUNG")!;
    const verwHrefs = verwGroup.items.map((i) => i.href);
    expect(verwHrefs).toContain("/aufgaben");
    // /audit-log gehoert jetzt zu WERKZEUGE, nicht mehr zu VERWALTUNG
    expect(verwHrefs).not.toContain("/audit-log");

    const werkzeugeGroup = groups.find((g) => g.label === "WERKZEUGE")!;
    const werkzeugeHrefs = werkzeugeGroup.items.map((i) => i.href);
    expect(werkzeugeHrefs).toContain("/handoffs");
    expect(werkzeugeHrefs).toContain("/referrals");
    expect(werkzeugeHrefs).toContain("/audit-log");
  });

  it("groupVisualMerged fuer Member: VERWALTUNG-Gruppe vorhanden, KEINE WERKZEUGE-Gruppe", () => {
    const groups = groupVisualMerged(filterByRole("member"));
    const verwGroup = groups.find((g) => g.label === "VERWALTUNG");
    expect(verwGroup).toBeDefined();
    const verwHrefs = verwGroup!.items.map((i) => i.href);
    expect(verwHrefs).toContain("/aufgaben");
    expect(verwHrefs).not.toContain("/audit-log");
    expect(verwHrefs).not.toContain("/handoffs");

    // Member sieht KEINE WERKZEUGE-Top-Gruppe
    expect(groups.find((g) => g.label === "WERKZEUGE")).toBeUndefined();
  });
});
