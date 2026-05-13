// SLC-705 MT-4 — Client-Wrapper um <KIWorkspace> fuer das Team-Cockpit.
//
// Analog zu CockpitKIWorkspace: liefert den loadRunner-Switch fuer die 3 Team-
// Report-Pfade, weil der Default-Loader in useReportRun nur "_mock" kennt.
"use client";

import { useCallback } from "react";
import { KIWorkspace } from "@/components/ki-workspace/KIWorkspace";
import { TEAM_COCKPIT_REPORTS } from "@/components/ki-workspace/reports/registry";
import type { ReportRunner } from "@/components/ki-workspace/types";

interface Props {
  callerUserId: string;
  callerTeamId: string | null;
  voiceEnabled?: boolean;
}

const REPORT_PATHS = [
  "@/lib/ki-workspace/reports/team-underperformance",
  "@/lib/ki-workspace/reports/team-burnout",
  "@/lib/ki-workspace/reports/team-stale-deals",
] as const;

type ReportPath = (typeof REPORT_PATHS)[number];

function isKnownPath(path: string): path is ReportPath {
  return (REPORT_PATHS as readonly string[]).includes(path);
}

export function TeamKiWorkspace({ callerUserId, callerTeamId, voiceEnabled = false }: Props) {
  const loadRunner = useCallback(async (path: string): Promise<ReportRunner> => {
    if (!isKnownPath(path)) {
      throw new Error(`Unknown report path: ${path}`);
    }
    switch (path) {
      case "@/lib/ki-workspace/reports/team-underperformance": {
        const m = await import("@/lib/ki-workspace/reports/team-underperformance");
        return m.runReport;
      }
      case "@/lib/ki-workspace/reports/team-burnout": {
        const m = await import("@/lib/ki-workspace/reports/team-burnout");
        return m.runReport;
      }
      case "@/lib/ki-workspace/reports/team-stale-deals": {
        const m = await import("@/lib/ki-workspace/reports/team-stale-deals");
        return m.runReport;
      }
    }
  }, []);

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-700 mb-3">KI-Workspace — Team</h2>
      <KIWorkspace
        context="team-cockpit"
        reports={TEAM_COCKPIT_REPORTS}
        scope={{ userId: callerUserId, teamId: callerTeamId ?? undefined }}
        voiceEnabled={voiceEnabled}
        loadRunner={loadRunner}
      />
    </div>
  );
}
