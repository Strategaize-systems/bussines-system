"use client";

import { useCallback } from "react";
import { KIWorkspace } from "@/components/ki-workspace/KIWorkspace";
import { DEAL_DETAIL_REPORTS } from "@/components/ki-workspace/reports/registry";
import type { ReportRunner } from "@/components/ki-workspace/types";

interface Props {
  userId: string;
  dealId: string;
}

const REPORT_PATHS = [
  "@/lib/ki-workspace/reports/briefing",
  "@/lib/ki-workspace/reports/signale",
  "@/lib/ki-workspace/reports/risiken",
  "@/lib/ki-workspace/reports/naechster-schritt",
  "@/lib/ki-workspace/reports/winloss",
] as const;

type ReportPath = (typeof REPORT_PATHS)[number];

function isKnownPath(path: string): path is ReportPath {
  return (REPORT_PATHS as readonly string[]).includes(path);
}

export function DealKIWorkspace({ userId, dealId }: Props) {
  const loadRunner = useCallback(async (path: string): Promise<ReportRunner> => {
    if (!isKnownPath(path)) {
      throw new Error(`Unknown report path: ${path}`);
    }
    switch (path) {
      case "@/lib/ki-workspace/reports/briefing": {
        const m = await import("@/lib/ki-workspace/reports/briefing");
        return m.runReport;
      }
      case "@/lib/ki-workspace/reports/signale": {
        const m = await import("@/lib/ki-workspace/reports/signale");
        return m.runReport;
      }
      case "@/lib/ki-workspace/reports/risiken": {
        const m = await import("@/lib/ki-workspace/reports/risiken");
        return m.runReport;
      }
      case "@/lib/ki-workspace/reports/naechster-schritt": {
        const m = await import("@/lib/ki-workspace/reports/naechster-schritt");
        return m.runReport;
      }
      case "@/lib/ki-workspace/reports/winloss": {
        const m = await import("@/lib/ki-workspace/reports/winloss");
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
        context="deal-detail"
        reports={DEAL_DETAIL_REPORTS}
        scope={{ userId, dealId }}
        voiceEnabled={true}
        loadRunner={loadRunner}
      />
    </div>
  );
}
