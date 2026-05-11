"use client";

import { useCallback, useState } from "react";
import type {
  KIWorkspaceReport,
  KIWorkspaceScope,
  ReportResult,
  ReportRunner,
} from "../types";
import { getCached, makeCacheKey, setCached } from "@/lib/ki-workspace/cache";

export interface UseReportRunResult {
  run: (
    report: KIWorkspaceReport,
    scope: KIWorkspaceScope,
    opts?: { bypassCache?: boolean },
  ) => Promise<ReportResult | null>;
  isLoading: boolean;
  error: string | null;
  result: ReportResult | null;
}

export interface UseReportRunOptions {
  /**
   * Injection point fuer Tests und SLC-662/664/666-Caller, die echte
   * Server-Actions registrieren. Default loadt das Mock-Modul fuer
   * SLC-661, weil alle 16 Berichte in der Foundation auf _mock zeigen.
   */
  loadRunner?: (serverActionPath: string) => Promise<ReportRunner>;
}

const defaultLoadRunner: (path: string) => Promise<ReportRunner> = async (path) => {
  if (path === "@/lib/ki-workspace/reports/_mock") {
    const mod = await import("@/lib/ki-workspace/reports/_mock");
    return mod.runReport;
  }
  throw new Error(`Unknown report path: ${path}`);
};

export function useReportRun(options: UseReportRunOptions = {}): UseReportRunResult {
  const loadRunner = options.loadRunner ?? defaultLoadRunner;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReportResult | null>(null);

  const run = useCallback(
    async (
      report: KIWorkspaceReport,
      scope: KIWorkspaceScope,
      opts?: { bypassCache?: boolean },
    ): Promise<ReportResult | null> => {
      setError(null);
      const key = makeCacheKey(report.id, scope);

      if (!opts?.bypassCache && report.cacheable) {
        const cached = getCached(key);
        if (cached) {
          setResult(cached);
          return cached;
        }
      }

      setIsLoading(true);
      try {
        const runner = await loadRunner(report.serverActionPath);
        const fresh = await runner({
          reportId: report.id,
          scope,
          bypassCache: opts?.bypassCache,
        });
        if (report.cacheable) {
          setCached(key, fresh);
        }
        setResult(fresh);
        return fresh;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Bedrock-Call fehlgeschlagen");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [loadRunner],
  );

  return { run, isLoading, error, result };
}
