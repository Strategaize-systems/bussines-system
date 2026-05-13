// SLC-705 MT-4 — Cache-Key um teamId erweitert (backwards-compatible: ?? "" haelt
// V6.6-Keys stabil, weil teamId dort undefined ist).
import type { KIWorkspaceScope, ReportResult } from "@/components/ki-workspace/types";

const TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  value: ReportResult;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

export function makeCacheKey(reportId: string, scope: KIWorkspaceScope): string {
  return `${reportId}|${scope.userId}|${scope.teamId ?? ""}|${scope.dealId ?? ""}`;
}

export function getCached(key: string): ReportResult | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function setCached(key: string, value: ReportResult): void {
  store.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

export function invalidate(key: string): void {
  store.delete(key);
}

export function __resetCacheForTests(): void {
  store.clear();
}
