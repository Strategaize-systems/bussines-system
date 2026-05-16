// V7.5 SLC-752 MT-1 — Bedrock-Region-Pin Tests.
//
// Pure-Function-Test gegen `assertBedrockRegion`. Verifiziert dass ein
// Drift weg von eu-central-1 zur Laufzeit fehlschlaegt — Data-Residency-Pflicht
// laut .claude/rules/data-residency.md.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { assertBedrockRegion } from "../bedrock-client";

describe("assertBedrockRegion (V7.5 SLC-752 MT-1 — Region-Pin)", () => {
  const ORIG_BEDROCK = process.env.BEDROCK_REGION;
  const ORIG_AWS = process.env.AWS_REGION;

  beforeEach(() => {
    delete process.env.BEDROCK_REGION;
    delete process.env.AWS_REGION;
  });

  afterEach(() => {
    if (ORIG_BEDROCK === undefined) delete process.env.BEDROCK_REGION;
    else process.env.BEDROCK_REGION = ORIG_BEDROCK;
    if (ORIG_AWS === undefined) delete process.env.AWS_REGION;
    else process.env.AWS_REGION = ORIG_AWS;
  });

  it("returns eu-central-1 when BEDROCK_REGION=eu-central-1", () => {
    process.env.BEDROCK_REGION = "eu-central-1";
    expect(assertBedrockRegion()).toBe("eu-central-1");
  });

  it("throws with descriptive message when BEDROCK_REGION=us-east-1", () => {
    process.env.BEDROCK_REGION = "us-east-1";
    expect(() => assertBedrockRegion()).toThrow(
      "Bedrock-Region-Drift: BEDROCK_REGION=us-east-1, erwartet eu-central-1. Data-Residency-Pflicht laut data-residency.md."
    );
  });

  it("throws with descriptive message when AWS_REGION drift (fallback path)", () => {
    process.env.AWS_REGION = "us-west-2";
    expect(() => assertBedrockRegion()).toThrow(
      "Bedrock-Region-Drift: AWS_REGION=us-west-2, erwartet eu-central-1. Data-Residency-Pflicht laut data-residency.md."
    );
  });

  it("falls back to AWS_REGION=eu-central-1 when BEDROCK_REGION unset (backwards compat)", () => {
    process.env.AWS_REGION = "eu-central-1";
    expect(assertBedrockRegion()).toBe("eu-central-1");
  });

  it("prefers BEDROCK_REGION over AWS_REGION when both set", () => {
    process.env.BEDROCK_REGION = "eu-central-1";
    process.env.AWS_REGION = "us-east-1";
    expect(assertBedrockRegion()).toBe("eu-central-1");
  });

  it("throws when BEDROCK_REGION drifts even if AWS_REGION is eu-central-1", () => {
    process.env.BEDROCK_REGION = "us-east-1";
    process.env.AWS_REGION = "eu-central-1";
    expect(() => assertBedrockRegion()).toThrow(/BEDROCK_REGION=us-east-1/);
  });

  it("throws when both BEDROCK_REGION and AWS_REGION are unset", () => {
    expect(() => assertBedrockRegion()).toThrow(
      "Bedrock-Region-Drift: weder BEDROCK_REGION noch AWS_REGION gesetzt, erwartet eu-central-1. Data-Residency-Pflicht laut data-residency.md."
    );
  });
});
