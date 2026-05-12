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
  it("contains the V6.6-baseline + V7 TEAM-stubs (>=21 items)", () => {
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

  it("teamlead sees ANALYSE + TEAM + OPERATIV + ARBEITSBEREICHE + VERWALTUNG (ohne admin-only)", () => {
    const items = filterByRole("teamlead");
    const hrefs = items.map((i) => i.href);
    // Sichtbar:
    expect(hrefs).toContain("/dashboard");
    expect(hrefs).toContain("/team");
    expect(hrefs).toContain("/settings/team");
    expect(hrefs).toContain("/mein-tag");
    expect(hrefs).toContain("/deals");
    expect(hrefs).toContain("/handoffs");
    expect(hrefs).toContain("/cadences");
    // NICHT sichtbar (admin-only):
    expect(hrefs).not.toContain("/settings/products");
    expect(hrefs).not.toContain("/audit-log");
  });

  it("member sieht KEIN /dashboard, KEIN /team, KEIN admin-Tool", () => {
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
    expect(hrefs).not.toContain("/performance/goals");
    expect(hrefs).not.toContain("/cadences");
    expect(hrefs).not.toContain("/settings/products");
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

  it("member sees no VERWALTUNG_SETUP-section items", () => {
    const items = filterByRole("member");
    expect(items.filter((i) => i.section === "VERWALTUNG_SETUP")).toHaveLength(0);
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
          "VERWALTUNG_SETUP:/handoffs",
          "VERWALTUNG_SETUP:/referrals",
          "VERWALTUNG_SETUP:/performance/goals",
          "VERWALTUNG_SETUP:/cadences",
          "VERWALTUNG_SETUP:/settings/products",
          "VERWALTUNG_SETUP:/audit-log",
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
          "VERWALTUNG_SETUP:/handoffs",
          "VERWALTUNG_SETUP:/referrals",
          "VERWALTUNG_SETUP:/performance/goals",
          "VERWALTUNG_SETUP:/cadences",
        ],
      }
    `);
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
      "VERWALTUNG_SETUP",
    ]);
  });

  it("groupBySection skips sections without items (member sieht keine ANALYSE/TEAM)", () => {
    const groups = groupBySection(filterByRole("member"));
    const sections = groups.map((g) => g.section);
    expect(sections).not.toContain("ANALYSE");
    expect(sections).not.toContain("TEAM");
    expect(sections).not.toContain("VERWALTUNG_SETUP");
    expect(sections).toContain("OPERATIV");
    expect(sections).toContain("ARBEITSBEREICHE");
    expect(sections).toContain("VERWALTUNG_MEIN");
  });

  it("groupVisualMerged kollabiert VERWALTUNG_MEIN + _SETUP zu einer VERWALTUNG-Gruppe (Admin)", () => {
    const groups = groupVisualMerged(filterByRole("admin"));
    const labels = groups.map((g) => g.label);
    // VERWALTUNG taucht nur einmal auf
    expect(labels.filter((l) => l === "VERWALTUNG")).toHaveLength(1);
    // Items beider Sub-Sections sind drin
    const verwGroup = groups.find((g) => g.label === "VERWALTUNG")!;
    const verwHrefs = verwGroup.items.map((i) => i.href);
    expect(verwHrefs).toContain("/aufgaben"); // _MEIN
    expect(verwHrefs).toContain("/audit-log"); // _SETUP
  });

  it("groupVisualMerged fuer Member hat eine VERWALTUNG-Gruppe ohne _SETUP-items", () => {
    const groups = groupVisualMerged(filterByRole("member"));
    const verwGroup = groups.find((g) => g.label === "VERWALTUNG");
    expect(verwGroup).toBeDefined();
    const verwHrefs = verwGroup!.items.map((i) => i.href);
    expect(verwHrefs).toContain("/aufgaben");
    expect(verwHrefs).not.toContain("/audit-log");
    expect(verwHrefs).not.toContain("/handoffs");
  });
});
