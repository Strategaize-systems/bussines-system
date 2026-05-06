// V6.2 SLC-625 — Tracking-Link-Token (DEC-137)
//
// 8-char URL-safe Token via Node-stdlib crypto. Keine npm-Dependency.
// ~2.8e14 Combos -> Kollision <0.001% bei 1M Links.

import { randomBytes } from "node:crypto";

const TOKEN_REGEX = /^[A-Za-z0-9_-]{8}$/;

export function generateCampaignToken(): string {
  return randomBytes(6).toString("base64url");
}

export function isValidCampaignToken(token: string): boolean {
  return TOKEN_REGEX.test(token);
}
