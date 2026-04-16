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

export function extractClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}
