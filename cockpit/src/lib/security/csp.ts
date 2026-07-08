// SLC-910 (V8.12 Defense-in-Depth, BL-501, DEC-279) — Build-Time Domain-Inventur
// fuer Content-Security-Policy + Permissions-Policy.
//
// Pattern aus immoscheckheft SLC-331 src/lib/security/csp-allowlist.ts
// (Rule: .claude/rules/strategaize-pattern-reuse.md + security-headers-live-smoke.md).
// BS-spezifisch: kein seven.io (SMS laeuft via Asterisk/Cal.com server-side),
// optionaler report-uri fuer die Phase-A Report-Only Burn-In via Sentry.
//
// Update bei neuem External-Service. Erweiterungen IMMER mit DEC dokumentieren.
//
// Allowlist-Domains (connect-src):
//   'self'                                              — eigene Origin
//   https://*.sentry.io                                 — Wildcard EU/US-Region (DEC-277)
//   <supabase-kong>                                     — Public-Kong-FQDN (NEXT_PUBLIC_SUPABASE_URL),
//                                                         deckt auch Supabase-Realtime wss:// auf gleichem Host
//   https://bedrock-runtime.eu-central-1.amazonaws.com  — LLM EU (data-residency.md)
//   wss://<sip-domain>                                  — In-App-SIP-Softphone-Transport (sip.js
//                                                         transportOptions.server, use-sip-phone.ts).
//                                                         ISSUE-138 / SLC-915 MT-1 (V8.17): Phase-B-CSP-Enforce
//                                                         (SLC-910) blockte den WSS-Connect ohne diese Origin.

export function buildCSP(
  supabaseKongUrl: string,
  sipWssOrigin: string,
  reportUri = "",
): string {
  const connectSrc = [
    "'self'",
    "https://*.sentry.io",
    supabaseKongUrl,
    "https://bedrock-runtime.eu-central-1.amazonaws.com",
    sipWssOrigin,
  ]
    .filter((s) => s.length > 0)
    .join(" ");

  const directives = [
    `default-src 'self'`,
    // 'unsafe-inline' Pflicht fuer Next.js 15+ RSC-inline-Scripts (__next_f.push).
    // Ohne wird React-Hydration komplett geblockt (entdeckt immoscheckheft V3.3
    // Live-Smoke 2026-06-08 via tests/_probe/csp-check.mjs, ~15min Production-Outage
    // ISSUE-026). Migration zu Nonce-CSP via Middleware = V8.x-Post-Slot.
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'`,
    `connect-src ${connectSrc}`,
    `img-src 'self' data: blob:`,
    `style-src 'self' 'unsafe-inline'`, // Tailwind-Generated
    `font-src 'self'`,
    `frame-ancestors 'none'`, // Clickjacking-Defense
    `base-uri 'self'`,
    `form-action 'self'`,
  ];

  // Phase-A Report-Only: report-uri sammelt Violations zentral in Sentry, damit
  // die Inline-Script-/Domain-Inventur vor dem Phase-B strict-Switch sichtbar ist.
  // Leer (Default) => kein report-uri-Directive (fail-safe, kein Crash).
  if (reportUri.length > 0) {
    directives.push(`report-uri ${reportUri}`);
  }

  return directives.join("; ");
}

// ISSUE-138 / SLC-915 MT-1 (V8.17): microphone=(self) fuer das In-App-SIP-Softphone
// (App-Origin, getUserMedia im Call-Flow). camera=() BLEIBT — In-App-Meetings oeffnen
// Jitsi via window.open auf separater Origin (meet.strategaizetransition.com), KEIN
// App-Origin-iframe → Permissions-Policy gated Jitsi nicht (Step-0 DRIFT-1, DEC-306/307).
export const PERMISSIONS_POLICY =
  "camera=(), microphone=(self), geolocation=(), payment=(), usb=()";
