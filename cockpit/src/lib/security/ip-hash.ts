import { createHash } from "node:crypto";

function dailySalt(): string {
  const base = process.env.CONSENT_DAILY_SALT;
  if (!base) {
    throw new Error(
      "CONSENT_DAILY_SALT env var is required for consent IP hashing"
    );
  }
  const dayKey = new Date().toISOString().slice(0, 10);
  return `${base}:${dayKey}`;
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256").update(dailySalt()).update(":ip:").update(ip).digest("hex");
}

export function hashUserAgent(ua: string | null | undefined): string | null {
  if (!ua) return null;
  return createHash("sha256").update(dailySalt()).update(":ua:").update(ua).digest("hex");
}

/**
 * Anzahl vertrauenswuerdiger Reverse-Proxy-Hops vor der App. Die reale Client-IP
 * ist der Eintrag `TRUSTED_PROXY_COUNT` Positionen von RECHTS in X-Forwarded-For
 * (jeder vertrauenswuerdige Proxy haengt die von ihm gesehene Peer-IP an).
 * Default 1 = ein vertrauenswuerdiger Proxy (coolify-proxy/Traefik).
 */
function trustedProxyCount(): number {
  const raw = process.env.TRUSTED_PROXY_COUNT;
  const n = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/**
 * Ermittelt die Client-IP aus den Reverse-Proxy-Headern.
 *
 * SECURITY (ISSUE-120 / R-913-3, live-verifiziert 2026-06-13): Die fruehere
 * Implementierung nahm den LINKESTEN X-Forwarded-For-Eintrag — der ist
 * client-kontrolliert und damit spoofbar (frischer Rate-Limit-Bucket pro
 * Request). coolify-proxy (Traefik) laeuft ohne forwardedHeaders.trustedIPs,
 * verwirft daher den client-gelieferten XFF und ersetzt ihn durch die reale
 * Peer-IP (Einzelwert). Wir verlassen uns aber nicht auf die linke Position:
 * bei N vertrauenswuerdigen Proxies ist die Client-IP der N-te Eintrag von
 * rechts. Nur dieser rechte(-Offset) Wert ist von extern nicht injizierbar.
 */
export function extractClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      const idx = Math.max(0, parts.length - trustedProxyCount());
      const ip = parts[idx];
      if (ip) return ip;
    }
  }
  // Fallback nur wenn XFF fehlt. Traefik setzt x-real-ip auf die reale Peer-IP;
  // hinter dem konfigurierten Proxy ist XFF immer gesetzt, daher Belt-and-
  // Suspenders fuer nicht-proxied/lokale Kontexte.
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}
