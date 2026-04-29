import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdf-parse"],
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
