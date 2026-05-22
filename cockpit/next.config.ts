import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
