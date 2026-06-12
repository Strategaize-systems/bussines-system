// V8.7-B SLC-355 MT-4 — Item-Builder (deterministisch). Deckt AC-355-4.

import { describe, expect, it } from "vitest";

import {
  buildObjectionItem,
  buildWinLossItem,
  isoWeekOf,
  slugifyBranche,
} from "../build-items";
import type { ObjectionGroup, WinLossBucket } from "../types";

const DISTILLED = { markdown: "## Lessons\n- Muster", costUsd: 0.008 };

function bucket(overrides: Partial<WinLossBucket> = {}): WinLossBucket {
  return {
    branche: "Beratung & Consulting",
    sizeBucket: "small",
    targetStatus: "won",
    dealCount: 3,
    runMarkdowns: ["x"],
    ...overrides,
  };
}

describe("isoWeekOf", () => {
  it("liefert YYYY-Www-Format", () => {
    expect(isoWeekOf(new Date("2026-06-14T02:00:00Z"))).toMatch(/^\d{4}-W\d{2}$/);
  });
  it("2026-01-01 (Donnerstag) => 2026-W01", () => {
    expect(isoWeekOf(new Date("2026-01-01T12:00:00Z"))).toBe("2026-W01");
  });
  it("2025-12-31 (Mittwoch) gehoert zu 2026-W01", () => {
    expect(isoWeekOf(new Date("2025-12-31T12:00:00Z"))).toBe("2026-W01");
  });
});

describe("slugifyBranche", () => {
  it("normalisiert Umlaute, Leerzeichen, Sonderzeichen", () => {
    expect(slugifyBranche("Beratung & Consulting")).toBe("beratung-consulting");
    expect(slugifyBranche("Groß & Klein GmbH")).toBe("gross-klein-gmbh");
    expect(slugifyBranche("Öffentlicher Sektor")).toBe("oeffentlicher-sektor");
  });
  it("unknown bleibt unknown", () => {
    expect(slugifyBranche("unknown")).toBe("unknown");
  });
});

describe("buildWinLossItem — AC-355-4", () => {
  it("deterministisches week-stamped source_reference", () => {
    const a = buildWinLossItem(bucket(), DISTILLED, "2026-W24");
    const b = buildWinLossItem(bucket(), DISTILLED, "2026-W24");
    expect(a.source_reference).toBe(b.source_reference);
    expect(a.source_reference).toBe(
      "bs-winloss-2026-W24-branche:beratung-consulting-size:small-won"
    );
  });

  it("lost-Status spiegelt sich in source_reference", () => {
    const item = buildWinLossItem(
      bucket({ targetStatus: "lost", sizeBucket: "large" }),
      DISTILLED,
      "2026-W24"
    );
    expect(item.source_reference).toBe(
      "bs-winloss-2026-W24-branche:beratung-consulting-size:large-lost"
    );
  });

  it("setzt Konstanten + Metadaten + Tags + Body", () => {
    const item = buildWinLossItem(bucket(), DISTILLED, "2026-W24");
    expect(item.domain).toBe("sales");
    expect(item.source_system).toBe("business_system");
    expect(item.body_markdown).toBe(DISTILLED.markdown);
    expect(item.title.length).toBeGreaterThan(0);
    expect(item.tags).toEqual(["winloss", "branche:beratung-consulting"]);
    expect(item.metadata).toMatchObject({
      deal_count: 3,
      size_bucket: "small",
      target_status: "won",
      iso_week: "2026-W24",
    });
  });
});

describe("buildObjectionItem — AC-355-4", () => {
  function group(overrides: Partial<ObjectionGroup> = {}): ObjectionGroup {
    return { branche: "IT", noteCount: 4, notes: ["a"], ...overrides };
  }

  it("deterministisches source_reference ohne size/status", () => {
    const item = buildObjectionItem(group(), DISTILLED, "2026-W24");
    expect(item.source_reference).toBe("bs-objection-2026-W24-branche:it");
    expect(item.domain).toBe("sales");
    expect(item.source_system).toBe("business_system");
    expect(item.tags).toEqual(["objection", "branche:it"]);
    expect(item.metadata).toMatchObject({ note_count: 4, iso_week: "2026-W24" });
  });
});
