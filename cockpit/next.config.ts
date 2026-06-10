import type { NextConfig } from "next";

import { buildCSP, PERMISSIONS_POLICY } from "./src/lib/security/csp";

// SLC-910 (V8.12, BL-501, DEC-279) — Security-Header-Bundle.
// Phase-A: Content-Security-Policy-Report-Only (kein Block, nur Sentry-Report) +
// Permissions-Policy + statische Hardening-Header. Phase-B (nach Burn-In) schaltet
// den Header-Namen auf "Content-Security-Policy" (siehe MT-5).
const CSP_VALUE = buildCSP(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  // Optional: Founder setzt SENTRY_CSP_REPORT_URI in Coolify auf den Sentry
  // Security-Endpoint, damit Phase-A-Violations zentral landen. Leer => browser-console-only.
  process.env.SENTRY_CSP_REPORT_URI ?? "",
);

const SECURITY_HEADERS = [
  // Phase-A: -Report-Only blockt NICHTS, meldet nur (Burn-In ohne Outage-Risiko).
  { key: "Content-Security-Policy-Report-Only", value: CSP_VALUE },
  { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // pdfmake + fontkit nutzen Native-Asset-Files (z.B. data.trie) und
  // mailparser haben dynamische Requires, die Turbopack nicht sauber bundlet.
  // Als externe Pakete behandelt, damit Node.js sie zur Laufzeit aufloest.
  serverExternalPackages: ["pdf-parse", "pdfmake", "@foliojs-fork/fontkit"],
  // SLC-825 V8.2 DSGVO-Public: legal Markdown-Files unter src/content/legal/
  // werden bei Build via fs.readFile in /datenschutz + /impressum geladen.
  // Standalone-Build muss die Files mit-kopieren.
  outputFileTracingIncludes: {
    "/datenschutz": ["./src/content/legal/datenschutz.md"],
    "/impressum": ["./src/content/legal/impressum.md"],
  },
  experimental: {
    // SLC-542 Refactor 2026-04-29: E-Mail-Anhang-Upload laeuft jetzt ueber
    // API-Route (`/api/emails/attachments`) — kein Server-Action-Body-Limit
    // im Upload-Pfad. 4mb deckt verbleibende grosse Server Actions ab:
    // uploadLogo (max 2 MB) + Voice-Record (Audio-Blob, typisch <1 MB).
    // Default 1 MB war zu eng fuer Logo-Upload bei groesseren Files.
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
