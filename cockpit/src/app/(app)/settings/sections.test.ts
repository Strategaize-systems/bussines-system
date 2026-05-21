import { describe, it, expect } from "vitest";
import { SETTINGS_SECTIONS, filterVisibleSections } from "./sections";

describe("SETTINGS_SECTIONS", () => {
  it("has the three expected sections (personal / sales / system)", () => {
    const keys = SETTINGS_SECTIONS.map((s) => s.key);
    expect(keys).toEqual(["personal", "sales", "system"]);
  });

  it("Rollen-Verwaltung-Tile is in the system section", () => {
    const system = SETTINGS_SECTIONS.find((s) => s.key === "system");
    expect(system).toBeDefined();
    const tile = system!.tiles.find((t) => t.href === "/settings/team");
    expect(tile).toBeDefined();
    expect(tile!.label).toBe("Rollen-Verwaltung");
  });

  it("Rollen-Verwaltung-Tile uses neutral description (SLC-823 AC2)", () => {
    const tile = SETTINGS_SECTIONS.flatMap((s) => s.tiles).find(
      (t) => t.href === "/settings/team",
    );
    expect(tile!.description).toBe("Team-Mitglieder einsehen und verwalten");
  });

  it("Rollen-Verwaltung-Tile is visible for admin AND teamlead (SLC-823 AC1)", () => {
    const tile = SETTINGS_SECTIONS.flatMap((s) => s.tiles).find(
      (t) => t.href === "/settings/team",
    );
    expect(tile!.visibleFor).toEqual(["admin", "teamlead"]);
  });
});

describe("filterVisibleSections", () => {
  it("admin sees Rollen-Verwaltung-Tile in system section (SLC-823 AC4)", () => {
    const sections = filterVisibleSections("admin");
    const system = sections.find((s) => s.key === "system");
    expect(system).toBeDefined();
    const hrefs = system!.tiles.map((t) => t.href);
    expect(hrefs).toContain("/settings/team");
  });

  it("teamlead sees Rollen-Verwaltung-Tile in system section (SLC-823 AC3)", () => {
    const sections = filterVisibleSections("teamlead");
    const system = sections.find((s) => s.key === "system");
    expect(system).toBeDefined();
    const hrefs = system!.tiles.map((t) => t.href);
    expect(hrefs).toContain("/settings/team");
  });

  it("member does NOT see Rollen-Verwaltung-Tile (SLC-823 AC5)", () => {
    const sections = filterVisibleSections("member");
    const allTiles = sections.flatMap((s) => s.tiles);
    const hrefs = allTiles.map((t) => t.href);
    expect(hrefs).not.toContain("/settings/team");
  });

  it("member sees only personal-section tiles (no system tiles at all)", () => {
    const sections = filterVisibleSections("member");
    const keys = sections.map((s) => s.key);
    expect(keys).toEqual(["personal"]);
  });

  it("teamlead sees personal + sales + system sections", () => {
    const sections = filterVisibleSections("teamlead");
    const keys = sections.map((s) => s.key);
    expect(keys).toContain("personal");
    expect(keys).toContain("sales");
    expect(keys).toContain("system");
  });

  it("filter drops sections with zero visible tiles for the given role", () => {
    const sections = filterVisibleSections("member");
    for (const s of sections) {
      expect(s.tiles.length).toBeGreaterThan(0);
    }
  });
});
