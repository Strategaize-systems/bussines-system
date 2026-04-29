import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdf-parse"],
  experimental: {
    // SLC-542 (E-Mail-Anhaenge): default 1 MB ist zu klein.
    // Pro-File-Limit ist 10 MB (MAX_FILE_SIZE_BYTES in attachments-whitelist.ts),
    // FormData-Overhead + Inline-Voice-Audio in anderen Server Actions liegt
    // bei wenigen kB. 12mb deckt 10-MB-Datei + Header/Boundary ab.
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
