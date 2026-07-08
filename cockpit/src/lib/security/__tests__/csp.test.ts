// SLC-910 MT-1 (V8.12, BL-501, DEC-279) — CSP + Permissions-Policy Tests.
// SLC-915 MT-1 (V8.17, ISSUE-138) — erweitert um den WSS-SIP-connect-src-Fix und
// microphone=(self), nachdem SLC-910 Phase-B (enforce) die In-App-Telefonie blockte
// (RPT-672). buildCSP hat seither die Signatur (kong, sipWssOrigin, reportUri="").
//
// Verifiziert dass buildCSP alle Pflicht-Domains enthaelt, die richtigen
// Hardening-Direktiven setzt (frame-ancestors 'none' + form-action 'self'),
// bei leerem Supabase-Kong-URL fail-safe bleibt, und das optionale report-uri
// (Phase-A Burn-In) korrekt an-/abschaltet.
//
// Pattern aus immoscheckheft SLC-331 csp-allowlist.test.ts (DEC-088).

import { describe, it, expect } from "vitest";

import { buildCSP, PERMISSIONS_POLICY } from "@/lib/security/csp";

const SUPABASE_KONG = "https://supabase-kong.example.de";
const SIP_WSS = "wss://sip.strategaizetransition.com";

function connectSrcOf(csp: string): string {
  return (
    csp
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.startsWith("connect-src ")) ?? ""
  );
}

describe("buildCSP (SLC-910 DEC-279 / SLC-915 ISSUE-138)", () => {
  it("enthaelt alle Pflicht-Allowlist-Domains in connect-src", () => {
    const csp = buildCSP(SUPABASE_KONG, SIP_WSS);

    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("https://*.sentry.io");
    expect(csp).toContain(SUPABASE_KONG);
    expect(csp).toContain("https://bedrock-runtime.eu-central-1.amazonaws.com");
  });

  it("nimmt die WSS-SIP-Origin in connect-src auf (ISSUE-138)", () => {
    expect(connectSrcOf(buildCSP(SUPABASE_KONG, SIP_WSS))).toContain(SIP_WSS);
  });

  it("laesst img-src app-weit unveraendert strikt (kein Aufweichen durch den Fix)", () => {
    const csp = buildCSP(SUPABASE_KONG, SIP_WSS);
    expect(csp).toContain("img-src 'self' data: blob:");
  });

  it("setzt frame-ancestors 'none' (Clickjacking) und form-action 'self' (Form-Hijacking)", () => {
    const csp = buildCSP(SUPABASE_KONG, SIP_WSS);

    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self'");
  });

  it("setzt default-src 'self' + base-uri 'self' + script-src mit 'unsafe-inline' + 'wasm-unsafe-eval'", () => {
    const csp = buildCSP(SUPABASE_KONG, SIP_WSS);

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("base-uri 'self'");
    // 'unsafe-inline' Pflicht fuer Next.js 15+ RSC __next_f.push inline-scripts
    // (Lehre immoscheckheft V3.3 Live-Smoke 2026-06-08 ISSUE-026 P0 Hydration-Outage).
    expect(csp).toContain("script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'");
  });

  it("ist fail-safe bei leerem supabaseKongUrl (kein Crash, leerer Slot entfernt)", () => {
    const csp = buildCSP("", SIP_WSS);

    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("https://*.sentry.io");
    expect(csp).toContain("https://bedrock-runtime.eu-central-1.amazonaws.com");
    // Kein doppeltes Whitespace ("  ") als Indikator fuer leeren Slot
    expect(csp).not.toMatch(/connect-src[^;]*  /);
  });

  it("ist fail-safe bei leerer WSS-SIP-Origin (leerer Slot entfernt)", () => {
    const connect = connectSrcOf(buildCSP(SUPABASE_KONG, ""));
    expect(connect).not.toMatch(/\s{2,}/);
    expect(connect.endsWith(" ")).toBe(false);
  });

  it("haengt report-uri an, wenn ein nicht-leerer reportUri uebergeben wird (3. Param)", () => {
    const csp = buildCSP(
      SUPABASE_KONG,
      SIP_WSS,
      "https://o123.ingest.de.sentry.io/api/456/security/?sentry_key=abc",
    );

    expect(csp).toContain(
      "report-uri https://o123.ingest.de.sentry.io/api/456/security/?sentry_key=abc",
    );
  });

  it("setzt KEIN report-uri-Directive bei leerem reportUri (Default, fail-safe)", () => {
    const csp = buildCSP(SUPABASE_KONG, SIP_WSS);

    expect(csp).not.toContain("report-uri");
  });
});

describe("PERMISSIONS_POLICY (SLC-910 DEC-279 / SLC-915 ISSUE-138)", () => {
  it("hat exakt 5 Features; nur microphone=(self), Rest Default-Deny", () => {
    expect(PERMISSIONS_POLICY).toBe(
      "camera=(), microphone=(self), geolocation=(), payment=(), usb=()",
    );
    const features = PERMISSIONS_POLICY.split(", ");
    expect(features).toHaveLength(5);
  });

  it("gibt das Mikrofon fuer die App-Origin frei (SIP-Softphone getUserMedia, ISSUE-138)", () => {
    expect(PERMISSIONS_POLICY).toContain("microphone=(self)");
  });

  it("laesst camera=() gesperrt (Jitsi = separater Origin via window.open, Step-0 DRIFT-1)", () => {
    expect(PERMISSIONS_POLICY).toContain("camera=()");
    expect(PERMISSIONS_POLICY).not.toContain("camera=(self)");
  });
});
