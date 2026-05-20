// V8 SLC-813 MT-1 — Parser Tests.

import { describe, it, expect } from "vitest";
import { parseLossReasonResponse } from "../loss-reason-parser";

describe("parseLossReasonResponse — V8 SLC-813 MT-1", () => {
  it("Happy-Path: 1 Suggestion", () => {
    const raw = JSON.stringify({
      suggestions: [
        {
          reason: "Preis zu hoch im Vergleich zum Wettbewerb.",
          source: "2026-05-15 | call | Preis-Diskussion",
        },
      ],
    });
    const result = parseLossReasonResponse(raw);
    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(result.data.suggestions).toHaveLength(1);
      expect(result.data.suggestions[0].reason).toMatch(/Preis/);
    }
  });

  it("Happy-Path: 3 Suggestions", () => {
    const raw = JSON.stringify({
      suggestions: [
        { reason: "Preis zu hoch.", source: "Call 2026-05-15" },
        { reason: "Timing passt nicht.", source: "E-Mail 2026-05-16" },
        { reason: "Wettbewerber gewonnen.", source: "Call 2026-05-17" },
      ],
    });
    const result = parseLossReasonResponse(raw);
    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(result.data.suggestions).toHaveLength(3);
    }
  });

  it("Parse-Error bei kaputtem JSON", () => {
    const raw = "{ suggestions: [ this is not JSON";
    const result = parseLossReasonResponse(raw);
    expect(result.kind).toBe("parse_error");
  });

  it("Schema-Error bei fehlender source-Feld", () => {
    const raw = JSON.stringify({
      suggestions: [{ reason: "Preis zu hoch." }],
    });
    const result = parseLossReasonResponse(raw);
    expect(result.kind).toBe("schema_error");
  });

  it("Schema-Error bei leerem suggestions-Array", () => {
    const raw = JSON.stringify({ suggestions: [] });
    const result = parseLossReasonResponse(raw);
    expect(result.kind).toBe("schema_error");
  });

  it("Schema-Error bei mehr als 3 Suggestions", () => {
    const raw = JSON.stringify({
      suggestions: [
        { reason: "A", source: "X" },
        { reason: "B", source: "X" },
        { reason: "C", source: "X" },
        { reason: "D", source: "X" },
      ],
    });
    const result = parseLossReasonResponse(raw);
    expect(result.kind).toBe("schema_error");
  });

  it("Empty-Suggestion Happy-Path (Fallback bei leerer History)", () => {
    const raw = JSON.stringify({
      suggestions: [
        {
          reason: "Kein klarer Verlustgrund in der Activity-History erkennbar.",
          source: "—",
        },
      ],
    });
    const result = parseLossReasonResponse(raw);
    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(result.data.suggestions[0].reason).toMatch(/Kein klarer Verlustgrund/);
    }
  });

  it("stripped Code-Fences und parsed JSON dazwischen", () => {
    const raw =
      "```json\n" +
      JSON.stringify({
        suggestions: [{ reason: "Preis.", source: "Call X" }],
      }) +
      "\n```";
    const result = parseLossReasonResponse(raw);
    expect(result.kind).toBe("success");
  });

  it("heal unescaped quotes inside reason string", () => {
    // Bedrock-Drift: unescaped " in string value.
    // Heal-Pattern wandelt das zu \" und JSON.parse gelingt.
    const raw = '{"suggestions":[{"reason":"Kunde sagte "zu teuer".","source":"Call"}]}';
    const result = parseLossReasonResponse(raw);
    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(result.data.suggestions[0].reason).toContain('zu teuer');
    }
  });
});
