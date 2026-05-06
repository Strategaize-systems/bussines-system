// V6.2 SLC-625 — IP-Hashing fuer Click-Log (DSGVO-konform)
//
// Klartext-IP wird nie persistiert. SHA-256 + ENV-Salt (rotation-bar).
// V1 Internal-Test toleriert Default-Constant-Salt; Pre-Production setzt
// IP_HASH_SALT als ENV.

import { createHash } from "node:crypto";

// V1 Internal-Test Default. Wird in Pre-Production via ENV ueberschrieben.
const DEFAULT_SALT = "strategaize-business-system-v62-default-salt";

export function getIpHashSalt(): string {
  return process.env.IP_HASH_SALT || DEFAULT_SALT;
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip + getIpHashSalt()).digest("hex");
}

/**
 * Extract first IP from x-forwarded-for / x-real-ip header.
 * Coolify-Traefik liefert beide. Erstes IP aus comma-separated Liste.
 */
export function extractClientIp(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xri = headers.get("x-real-ip");
  if (xri) return xri.trim();
  return null;
}
