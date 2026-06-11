/**
 * Tracking-URL HMAC Signatur-Tests — Open-Redirect-Schutz fuer /api/track/[id]
 *
 * Sicherstellt: signTrackingUrl + verifyTrackingSignature sind Roundtrip-stabil,
 * Tampering an trackingId / linkIndex / targetUrl wird erkannt, fehlende oder
 * fehlerhafte Signatur wird abgelehnt, und ohne Secret faellt der Mechanismus
 * fail-closed (signTrackingUrl gibt null, verifyTrackingSignature gibt false).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signTrackingUrl, verifyTrackingSignature } from "./tracking";

const SECRET = "test-tracking-hmac-secret-aaaaaaaaaaa";
const TRACKING_ID = "tid-abc-123";
const TARGET_URL = "https://example.com/path?q=1";

describe("signTrackingUrl + verifyTrackingSignature", () => {
  const originalSecret = process.env.TRACKING_HMAC_SECRET;

  beforeEach(() => {
    process.env.TRACKING_HMAC_SECRET = SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.TRACKING_HMAC_SECRET;
    } else {
      process.env.TRACKING_HMAC_SECRET = originalSecret;
    }
  });

  it("Roundtrip — gueltige Signatur wird verifiziert", () => {
    const sig = signTrackingUrl(TRACKING_ID, 0, TARGET_URL);
    expect(sig).not.toBeNull();
    expect(verifyTrackingSignature(TRACKING_ID, 0, TARGET_URL, sig!)).toBe(true);
  });

  it("verschiedene linkIndex erzeugen verschiedene Signaturen", () => {
    const sig0 = signTrackingUrl(TRACKING_ID, 0, TARGET_URL);
    const sig1 = signTrackingUrl(TRACKING_ID, 1, TARGET_URL);
    expect(sig0).not.toEqual(sig1);
  });

  it("ablehnen wenn targetUrl getampert wird (Open-Redirect-Angriff)", () => {
    const sig = signTrackingUrl(TRACKING_ID, 0, TARGET_URL)!;
    expect(
      verifyTrackingSignature(TRACKING_ID, 0, "https://evil.example.com", sig),
    ).toBe(false);
  });

  it("ablehnen wenn linkIndex getampert wird", () => {
    const sig = signTrackingUrl(TRACKING_ID, 0, TARGET_URL)!;
    expect(verifyTrackingSignature(TRACKING_ID, 1, TARGET_URL, sig)).toBe(false);
  });

  it("ablehnen wenn trackingId getampert wird", () => {
    const sig = signTrackingUrl(TRACKING_ID, 0, TARGET_URL)!;
    expect(
      verifyTrackingSignature("other-tid", 0, TARGET_URL, sig),
    ).toBe(false);
  });

  it("ablehnen wenn Signatur fehlt", () => {
    expect(verifyTrackingSignature(TRACKING_ID, 0, TARGET_URL, null)).toBe(false);
    expect(verifyTrackingSignature(TRACKING_ID, 0, TARGET_URL, undefined)).toBe(false);
    expect(verifyTrackingSignature(TRACKING_ID, 0, TARGET_URL, "")).toBe(false);
  });

  it("ablehnen wenn Signatur falsche Laenge hat (verhindert Length-Extension-/Padding-Tricks)", () => {
    expect(verifyTrackingSignature(TRACKING_ID, 0, TARGET_URL, "a")).toBe(false);
    expect(
      verifyTrackingSignature(TRACKING_ID, 0, TARGET_URL, "x".repeat(64)),
    ).toBe(false);
  });

  it("ablehnen wenn Signatur sich um ein Zeichen unterscheidet", () => {
    const sig = signTrackingUrl(TRACKING_ID, 0, TARGET_URL)!;
    const tampered = sig[0] === "A" ? "B" + sig.slice(1) : "A" + sig.slice(1);
    expect(verifyTrackingSignature(TRACKING_ID, 0, TARGET_URL, tampered)).toBe(false);
  });

  it("fail-closed ohne Secret — sign liefert null, verify liefert false", () => {
    delete process.env.TRACKING_HMAC_SECRET;
    expect(signTrackingUrl(TRACKING_ID, 0, TARGET_URL)).toBeNull();
    expect(
      verifyTrackingSignature(TRACKING_ID, 0, TARGET_URL, "any-signature"),
    ).toBe(false);
  });

  it("fail-closed bei zu kurzem Secret (<16 chars) — Hardening gegen Default-Schwaeche", () => {
    process.env.TRACKING_HMAC_SECRET = "short";
    expect(signTrackingUrl(TRACKING_ID, 0, TARGET_URL)).toBeNull();
  });
});
