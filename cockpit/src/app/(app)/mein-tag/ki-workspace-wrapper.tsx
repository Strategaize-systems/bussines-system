"use client";

import { useCallback } from "react";
import { KIWorkspace } from "@/components/ki-workspace/KIWorkspace";
import { MEIN_TAG_REPORTS } from "@/components/ki-workspace/reports/registry";
import type { ReportRunner } from "@/components/ki-workspace/types";

interface Props {
  userId: string;
}

const REPORT_PATHS = [
  "@/lib/ki-workspace/reports/tagesanalyse",
  "@/lib/ki-workspace/reports/gestern",
  "@/lib/ki-workspace/reports/seit-login",
  "@/lib/ki-workspace/reports/wochen-performance",
  "@/lib/ki-workspace/reports/pipeline-risiko",
] as const;

type ReportPath = (typeof REPORT_PATHS)[number];

function isKnownPath(path: string): path is ReportPath {
  return (REPORT_PATHS as readonly string[]).includes(path);
}

export function MeinTagKIWorkspace({ userId }: Props) {
  const loadRunner = useCallback(async (path: string): Promise<ReportRunner> => {
    if (!isKnownPath(path)) {
      throw new Error(`Unknown report path: ${path}`);
    }
    switch (path) {
      case "@/lib/ki-workspace/reports/tagesanalyse": {
        const m = await import("@/lib/ki-workspace/reports/tagesanalyse");
        return m.runReport;
      }
      case "@/lib/ki-workspace/reports/gestern": {
        const m = await import("@/lib/ki-workspace/reports/gestern");
        return m.runReport;
      }
      case "@/lib/ki-workspace/reports/seit-login": {
        const m = await import("@/lib/ki-workspace/reports/seit-login");
        return m.runReport;
      }
      case "@/lib/ki-workspace/reports/wochen-performance": {
        const m = await import("@/lib/ki-workspace/reports/wochen-performance");
        return m.runReport;
      }
      case "@/lib/ki-workspace/reports/pipeline-risiko": {
        const m = await import("@/lib/ki-workspace/reports/pipeline-risiko");
        return m.runReport;
      }
    }
  }, []);

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#120774] to-[#4454b8] flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">KI</span>
        </div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">KI-Workspace</h3>
      </div>
      <KIWorkspace
        context="mein-tag"
        reports={MEIN_TAG_REPORTS}
        scope={{ userId }}
        voiceEnabled={true}
        loadRunner={loadRunner}
      />
    </div>
  );
}
