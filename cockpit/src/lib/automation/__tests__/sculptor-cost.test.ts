// V7.5 SLC-752 MT-5 — Cost-Berechnung Tests.
//
// AC5 Reference: Mock Bedrock-Usage {input_tokens:1000, output_tokens:500} ->
// calculateSculptCost() returnt 0.003 * 1 + 0.015 * 0.5 = 0.0105 USD.

import { describe, it, expect } from "vitest";
import {
  PRICING,
  UnknownModelPricingError,
  calculateSculptCost,
  sumSculptCosts,
} from "../sculptor-cost";

const MODEL_46 = "eu.anthropic.claude-sonnet-4-6-20250514-v1:0";
const MODEL_45 = "anthropic.claude-sonnet-4-5-20250109-v1:0";
const MODEL_HAIKU = "anthropic.claude-haiku-4-5-20251001-v1:0";

describe("calculateSculptCost — V7.5 SLC-752 MT-5", () => {
  it("AC5 Reference: 1000 input + 500 output -> 0.0105 USD (Sonnet 4.6)", () => {
    const cost = calculateSculptCost(
      { input_tokens: 1000, output_tokens: 500 },
      MODEL_46
    );
    expect(cost).toBeCloseTo(0.0105, 6);
  });

  it("returnt 0 bei usage 0/0", () => {
    expect(
      calculateSculptCost({ input_tokens: 0, output_tokens: 0 }, MODEL_46)
    ).toBe(0);
  });

  it("Direct Model-ID (ohne eu-prefix) liefert identisches Pricing", () => {
    const a = calculateSculptCost(
      { input_tokens: 1000, output_tokens: 500 },
      MODEL_46
    );
    const b = calculateSculptCost(
      { input_tokens: 1000, output_tokens: 500 },
      "anthropic.claude-sonnet-4-6-20250514-v1:0"
    );
    expect(a).toBe(b);
  });

  it("Sonnet 4.5 und 4.6 haben identisches Pricing", () => {
    const a = calculateSculptCost(
      { input_tokens: 1000, output_tokens: 1000 },
      MODEL_46
    );
    const b = calculateSculptCost(
      { input_tokens: 1000, output_tokens: 1000 },
      MODEL_45
    );
    expect(a).toBe(b);
  });

  it("Haiku 4.5 ist ca 5x billiger als Sonnet 4.6", () => {
    const sonnet = calculateSculptCost(
      { input_tokens: 1000, output_tokens: 1000 },
      MODEL_46
    );
    const haiku = calculateSculptCost(
      { input_tokens: 1000, output_tokens: 1000 },
      MODEL_HAIKU
    );
    expect(haiku).toBeLessThan(sonnet);
    expect(haiku).toBeCloseTo(0.006, 6); // 0.001 + 0.005
  });

  it("wirft UnknownModelPricingError bei unbekanntem Model", () => {
    expect(() =>
      calculateSculptCost(
        { input_tokens: 100, output_tokens: 100 },
        "anthropic.claude-imaginary-99"
      )
    ).toThrow(UnknownModelPricingError);
  });

  it("wirft bei negativen Token-Counts", () => {
    expect(() =>
      calculateSculptCost({ input_tokens: -1, output_tokens: 100 }, MODEL_46)
    ).toThrow(/usage.input_tokens.*finite/);
  });

  it("wirft bei NaN Token-Counts", () => {
    expect(() =>
      calculateSculptCost(
        { input_tokens: Number.NaN, output_tokens: 100 },
        MODEL_46
      )
    ).toThrow(/finite/);
  });

  it("Pricing-Table enthaelt Cockpit-LLM_MODEL Default", () => {
    expect(PRICING[MODEL_46]).toBeDefined();
    expect(PRICING[MODEL_46].input_per_1k_usd).toBe(0.003);
    expect(PRICING[MODEL_46].output_per_1k_usd).toBe(0.015);
  });
});

describe("sumSculptCosts — Re-Prompt-Loop-Akkumulation", () => {
  it("1st-try-success: single cost", () => {
    expect(sumSculptCosts([0.0105])).toBeCloseTo(0.0105, 6);
  });

  it("2nd-try-success: kumulativ", () => {
    expect(sumSculptCosts([0.0105, 0.012])).toBeCloseTo(0.0225, 6);
  });

  it("Reject-after-2-attempts: kumulativ", () => {
    expect(sumSculptCosts([0.008, 0.014])).toBeCloseTo(0.022, 6);
  });

  it("Leeres Array -> 0", () => {
    expect(sumSculptCosts([])).toBe(0);
  });
});
