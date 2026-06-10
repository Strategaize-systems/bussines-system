import { describe, it, expect } from "vitest";
import {
  validatePasswordStrength,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MIN_SCORE,
} from "../password-policy";

describe("validatePasswordStrength", () => {
  // AC-908-1: zu kurz -> min_length, score 0 (nicht gemessen)
  it("rejects a too-short password with reason min_length (AC-908-1)", async () => {
    const result = await validatePasswordStrength("short");
    expect(result).toEqual({ ok: false, score: 0, reasons: ["min_length"] });
  });

  // Length-Edge: exakt 11 Zeichen ist noch unter dem 12er-Hard-Floor
  it("rejects an 11-char password (just under min length) with min_length", async () => {
    const result = await validatePasswordStrength("Test1234567"); // len 11
    expect(result).toEqual({ ok: false, score: 0, reasons: ["min_length"] });
  });

  // Length-Edge: leerer String
  it("rejects an empty password with min_length", async () => {
    const result = await validatePasswordStrength("");
    expect(result).toEqual({ ok: false, score: 0, reasons: ["min_length"] });
  });

  // AC-908-2: starke Passphrase, zxcvbn-Score 4
  it("accepts a strong passphrase with score 4 (AC-908-2)", async () => {
    const result = await validatePasswordStrength("correcthorsebatterystaple");
    expect(result).toEqual({ ok: true, score: 4, reasons: [] });
  });

  // AC-908-3: 12+ Zeichen, mittlere Score 3 -> Hard-Floor erfuellt
  it("accepts a 12-char password with score 3 (AC-908-3)", async () => {
    const result = await validatePasswordStrength("Test1234567X"); // len 12
    expect(result).toEqual({ ok: true, score: 3, reasons: [] });
  });

  // AC-908-4: 12+ Zeichen aber zxcvbn-Score 0 -> weak_strength
  it("rejects a 12-char password with score 0 as weak_strength (AC-908-4)", async () => {
    const result = await validatePasswordStrength("aaaaaaaaaaaa"); // len 12
    expect(result).toEqual({ ok: false, score: 0, reasons: ["weak_strength"] });
  });

  // Score-Boundary: 12+ Zeichen, zxcvbn-Score 1 (< Threshold 3) -> weak_strength
  it("rejects a 12-char password with score 1 as weak_strength", async () => {
    const result = await validatePasswordStrength("Password1234"); // len 12, score 1
    expect(result).toEqual({ ok: false, score: 1, reasons: ["weak_strength"] });
  });

  it("exposes the policy thresholds as named constants", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(12);
    expect(PASSWORD_MIN_SCORE).toBe(3);
  });
});
