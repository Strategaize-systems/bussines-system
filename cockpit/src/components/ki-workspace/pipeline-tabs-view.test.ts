import { describe, it, expect } from "vitest";
import {
  parsePipelineSections,
  extractTrailingBlock,
} from "./pipeline-tabs-view";

describe("parsePipelineSections", () => {
  it("returns empty array for empty input", () => {
    expect(parsePipelineSections("")).toEqual([]);
  });

  it("returns empty array when no Pipeline-headers exist", () => {
    expect(parsePipelineSections("## Pipeline-Snapshot\n- Stage A: 5 Deals")).toEqual([]);
  });

  it("parses single Pipeline section", () => {
    const md = "## Pipeline: Multiplikatoren\n- Deal A — 5000 EUR\n- Deal B — 3000 EUR";
    const result = parsePipelineSections(md);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Multiplikatoren");
    expect(result[0].body).toContain("Deal A");
    expect(result[0].body).toContain("Deal B");
  });

  it("parses two Pipeline sections in order", () => {
    const md = [
      "## Top-Chancen",
      "",
      "## Pipeline: Multiplikatoren",
      "- Deal A",
      "",
      "## Pipeline: Unternehmer-Chancen",
      "- Deal B",
      "- Deal C",
    ].join("\n");
    const result = parsePipelineSections(md);
    expect(result.map((s) => s.name)).toEqual([
      "Multiplikatoren",
      "Unternehmer-Chancen",
    ]);
    expect(result[0].body).toContain("Deal A");
    expect(result[1].body).toContain("Deal B");
    expect(result[1].body).toContain("Deal C");
  });

  it("ends current Pipeline section at next non-Pipeline ## header", () => {
    const md = [
      "## Pipeline: Multiplikatoren",
      "- Deal A",
      "",
      "## KI-Kommentar",
      "Footer-Text — gemeinsam.",
    ].join("\n");
    const result = parsePipelineSections(md);
    expect(result).toHaveLength(1);
    expect(result[0].body).toContain("Deal A");
    expect(result[0].body).not.toContain("Footer-Text");
  });

  it("trims whitespace from section names", () => {
    const result = parsePipelineSections("## Pipeline:   Padding   \n- x");
    expect(result[0].name).toBe("Padding");
  });
});

describe("extractTrailingBlock", () => {
  it("returns empty when no trailing header exists", () => {
    expect(
      extractTrailingBlock("## Pipeline: A\n- x\n## Pipeline: B\n- y"),
    ).toBe("");
  });

  it("returns last non-Pipeline ## block", () => {
    const md = [
      "## Pipeline: A",
      "- Deal A",
      "## KI-Kommentar",
      "Footer text",
      "second line",
    ].join("\n");
    expect(extractTrailingBlock(md)).toBe(
      "## KI-Kommentar\nFooter text\nsecond line",
    );
  });

  it("returns empty for input without trailing block", () => {
    expect(extractTrailingBlock("")).toBe("");
    expect(extractTrailingBlock("Just text without headers")).toBe("");
  });
});
