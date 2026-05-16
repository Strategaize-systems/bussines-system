// V7.5 SLC-752 MT-2 — healJsonEscapes Tests.
//
// Pattern aus IS-SLC-109 1:1 portiert. Validiert die 5 typischen Bedrock-
// JSON-Drift-Faelle die zur RPT-054 / ISSUE-026 Diagnose gefuehrt haben.

import { describe, it, expect } from "vitest";
import { healJsonEscapes, tryParseHealedJson } from "../heal-json-escapes";

describe("healJsonEscapes (IS-SLC-109 1:1 portiert)", () => {
  it("returns input unchanged for well-formed JSON", () => {
    const input = '{"key":"value","n":42}';
    expect(healJsonEscapes(input)).toBe(input);
  });

  it("returns input unchanged when no strings contain inner quotes", () => {
    const input = '{"a":"hello world","b":"no quotes here"}';
    expect(healJsonEscapes(input)).toBe(input);
  });

  it("preserves already-escaped quotes (no double-escape)", () => {
    const input = '{"quote":"He said \\"hi\\" today"}';
    expect(healJsonEscapes(input)).toBe(input);
    expect(JSON.parse(healJsonEscapes(input))).toEqual({
      quote: 'He said "hi" today',
    });
  });

  it("heals unescaped inner quotes (Standard-Drift-Case)", () => {
    const input = '{"quote":"He said "hi" today"}';
    const healed = healJsonEscapes(input);
    expect(healed).toBe('{"quote":"He said \\"hi\\" today"}');
    expect(JSON.parse(healed)).toEqual({ quote: 'He said "hi" today' });
  });

  it("heals multiple unescaped inner quotes in one string", () => {
    const input = '{"text":"first "inner" then "more" text"}';
    const healed = healJsonEscapes(input);
    expect(JSON.parse(healed)).toEqual({
      text: 'first "inner" then "more" text',
    });
  });

  it("heals across multiple keys in same object", () => {
    const input = '{"a":"hi "x" bye","b":"second "y" key"}';
    const healed = healJsonEscapes(input);
    expect(JSON.parse(healed)).toEqual({
      a: 'hi "x" bye',
      b: 'second "y" key',
    });
  });

  it("handles empty string values", () => {
    const input = '{"empty":"","next":"value"}';
    expect(healJsonEscapes(input)).toBe(input);
  });

  it("handles strings with structural-token-lookalikes inside (e.g. colon)", () => {
    const input = '{"k":"value : with colon"}';
    expect(healJsonEscapes(input)).toBe(input);
  });

  it("handles multiline content within strings", () => {
    const input = '{"body":"line1\\nline2 "quoted" line3"}';
    const healed = healJsonEscapes(input);
    expect(JSON.parse(healed)).toEqual({
      body: 'line1\nline2 "quoted" line3',
    });
  });

  it("handles escape sequences other than backslash-quote", () => {
    const input = '{"path":"C:\\\\Users\\\\test"}';
    expect(healJsonEscapes(input)).toBe(input);
  });
});

describe("tryParseHealedJson (Convenience-Helper)", () => {
  it("parses well-formed JSON directly", () => {
    expect(tryParseHealedJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("heals then parses Bedrock-drift JSON", () => {
    const input = '{"quote":"He said "hi""}';
    expect(tryParseHealedJson(input)).toEqual({ quote: 'He said "hi"' });
  });

  it("returns null for unrecoverable garbage", () => {
    expect(tryParseHealedJson("not even { close")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(tryParseHealedJson("")).toBeNull();
  });

  it("returns null when healing produces no change AND JSON.parse fails", () => {
    // `{` is invalid JSON, but no inner quotes to heal — so healJsonEscapes
    // returns the same text and we end up returning null.
    expect(tryParseHealedJson("{")).toBeNull();
  });
});
