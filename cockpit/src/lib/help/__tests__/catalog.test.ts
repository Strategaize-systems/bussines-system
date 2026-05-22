import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  HELP_CATALOG,
  HELP_SECTIONS,
  getHelpGuideBySlug,
  groupBySection,
  listHelpSlugs,
  rolesBadgeLabel,
} from "@/lib/help/catalog";

const VALID_ROLES = new Set(["admin", "teamlead", "member"]);
const VALID_SECTIONS = new Set([
  "erste-schritte",
  "verwaltung",
  "ki-werkzeuge",
  "spezial",
]);

describe("Help Catalog", () => {
  it("contains exactly 12 guides (matches RPT-510 user-guide output)", () => {
    expect(HELP_CATALOG).toHaveLength(12);
  });

  it("has unique slugs", () => {
    const slugs = HELP_CATALOG.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("all slugs use kebab-case (lowercase, dash-separated)", () => {
    for (const guide of HELP_CATALOG) {
      expect(guide.slug).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });

  it("all sections are in the HELP_SECTIONS set", () => {
    for (const guide of HELP_CATALOG) {
      expect(VALID_SECTIONS.has(guide.section)).toBe(true);
    }
  });

  it("all role entries are valid app roles and non-empty", () => {
    for (const guide of HELP_CATALOG) {
      expect(guide.roles.length).toBeGreaterThan(0);
      for (const r of guide.roles) {
        expect(VALID_ROLES.has(r)).toBe(true);
      }
    }
  });

  it("each guide has a positive duration", () => {
    for (const guide of HELP_CATALOG) {
      expect(guide.durationMinutes).toBeGreaterThan(0);
    }
  });

  it("each slug has a corresponding markdown file in src/content/help/", () => {
    // Test runs from cockpit/ working directory (vitest config); content lives
    // at src/content/help/<slug>.md relative to that.
    const root = path.join(process.cwd(), "src", "content", "help");
    for (const guide of HELP_CATALOG) {
      const filePath = path.join(root, `${guide.slug}.md`);
      expect(
        existsSync(filePath),
        `expected markdown file at ${filePath}`,
      ).toBe(true);
    }
  });
});

describe("getHelpGuideBySlug", () => {
  it("returns the guide for a known slug", () => {
    const guide = getHelpGuideBySlug("mein-tag");
    expect(guide).not.toBeNull();
    expect(guide?.slug).toBe("mein-tag");
  });

  it("returns null for an unknown slug", () => {
    expect(getHelpGuideBySlug("unknown-slug")).toBeNull();
  });
});

describe("listHelpSlugs", () => {
  it("returns all 12 slugs as a string array", () => {
    const slugs = listHelpSlugs();
    expect(slugs).toHaveLength(12);
    expect(slugs).toContain("mein-tag");
    expect(slugs).toContain("vat-reverse-charge");
  });
});

describe("groupBySection", () => {
  it("returns 4 section groups in the documented order", () => {
    const groups = groupBySection();
    expect(groups).toHaveLength(4);
    expect(groups.map((g) => g.meta.id)).toEqual([
      "erste-schritte",
      "verwaltung",
      "ki-werkzeuge",
      "spezial",
    ]);
  });

  it("each group only contains guides of its section", () => {
    const groups = groupBySection();
    for (const group of groups) {
      for (const guide of group.guides) {
        expect(guide.section).toBe(group.meta.id);
      }
    }
  });

  it("all 12 guides are distributed across groups (no orphans)", () => {
    const groups = groupBySection();
    const total = groups.reduce((acc, g) => acc + g.guides.length, 0);
    expect(total).toBe(12);
  });
});

describe("HELP_SECTIONS", () => {
  it("has 4 sections with unique ids and unique orders", () => {
    expect(HELP_SECTIONS).toHaveLength(4);
    const ids = HELP_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(4);
    const orders = HELP_SECTIONS.map((s) => s.order);
    expect(new Set(orders).size).toBe(4);
  });
});

describe("rolesBadgeLabel", () => {
  it("returns 'Alle Rollen' for admin+teamlead+member", () => {
    expect(rolesBadgeLabel(["admin", "teamlead", "member"])).toBe("Alle Rollen");
  });

  it("returns 'Admin, Teamlead' for admin+teamlead", () => {
    expect(rolesBadgeLabel(["admin", "teamlead"])).toBe("Admin, Teamlead");
  });

  it("returns 'Admin' for admin-only", () => {
    expect(rolesBadgeLabel(["admin"])).toBe("Admin");
  });
});
