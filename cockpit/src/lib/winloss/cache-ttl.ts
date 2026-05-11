// SLC-665 MT-8 — Pure TTL-Logik fuer manuellen Win/Loss-Re-Run.
// Wird vom Server-Action-Pfad (reports/winloss.ts) importiert und in
// Vitest direkt getestet — keine "use server"-Direktive noetig.

export const WINLOSS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function isAutoRunFresh(
  triggeredAtIso: string,
  nowMs: number,
  ttlMs: number = WINLOSS_CACHE_TTL_MS
): boolean {
  const t = Date.parse(triggeredAtIso);
  if (Number.isNaN(t)) return false;
  return nowMs - t < ttlMs;
}
