// SLC-665 MT-4 — Pure-Function-Tests fuer buildBedrockSummary + detectAutoReply

import { describe, it, expect } from "vitest";
import {
  buildBedrockSummary,
  detectAutoReply,
} from "./activity-helpers";
import type { ActivityRow } from "@/components/item-sheet/types";

describe("buildBedrockSummary", () => {
  it("returns undefined when no fields are present", () => {
    expect(buildBedrockSummary({})).toBeUndefined();
    expect(buildBedrockSummary({ summary: "" })).toBeUndefined();
    expect(
      buildBedrockSummary({ risks: null, objections: null, summary: "  " })
    ).toBeUndefined();
  });

  it("collects multi-line risk/objection/next-step bullets", () => {
    const result = buildBedrockSummary({
      risks: "- Budget unklar\n- Entscheider unbekannt",
      objections: "* Timing kritisch",
      next_steps: "Pitchdeck schicken\nDemo terminieren",
      participants: "Max\nMia",
      summary: "Solider Erstkontakt.",
    });
    expect(result?.risiken).toEqual(["Budget unklar", "Entscheider unbekannt"]);
    expect(result?.einwaende).toEqual(["Timing kritisch"]);
    expect(result?.naechsteSchritte).toEqual([
      "Pitchdeck schicken",
      "Demo terminieren",
    ]);
    expect(result?.teilnehmer).toEqual(["Max", "Mia"]);
    expect(result?.zusammenfassung).toBe("Solider Erstkontakt.");
  });

  it("returns subset when only some fields are filled", () => {
    const result = buildBedrockSummary({
      summary: "Kurze Notiz.",
    });
    expect(result).toBeDefined();
    expect(result?.risiken).toEqual([]);
    expect(result?.zusammenfassung).toBe("Kurze Notiz.");
  });
});

describe("detectAutoReply", () => {
  function activity(
    overrides: Partial<ActivityRow>
  ): ActivityRow {
    return {
      id: "a1",
      type: "inbox",
      title: null,
      description: null,
      summary: null,
      created_at: "2026-05-11T00:00:00Z",
      contact_id: null,
      company_id: null,
      deal_id: null,
      source_type: null,
      ...overrides,
    };
  }

  it("returns false for non-email activity types", () => {
    expect(
      detectAutoReply(activity({ type: "note", title: "Out of office" }))
    ).toBe(false);
    expect(
      detectAutoReply(activity({ type: "meeting", title: "Auto-Reply" }))
    ).toBe(false);
  });

  it("flags out-of-office subjects", () => {
    expect(
      detectAutoReply(activity({ type: "email", title: "Out of Office" }))
    ).toBe(true);
  });

  it("flags german abwesenheit", () => {
    expect(
      detectAutoReply(
        activity({
          type: "inbox",
          title: "AW: Termin",
          description: "Bin in Abwesenheit bis 20.05.",
        })
      )
    ).toBe(true);
  });

  it("returns false for normal email", () => {
    expect(
      detectAutoReply(
        activity({
          type: "email",
          title: "Pitchdeck",
          description: "Hier ist das Pitch-Deck.",
        })
      )
    ).toBe(false);
  });
});
