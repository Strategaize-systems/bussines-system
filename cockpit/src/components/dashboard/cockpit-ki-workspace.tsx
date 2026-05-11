"use client";

// SLC-666 Hotfix — Cockpit-spezifischer KIWorkspace-Wrapper mit loadRunner
// fuer die 6 Cockpit-Berichts-Pfade. Default-Loader in useReportRun kennt nur
// _mock, wirft sonst "Unknown report path".

import { useCallback } from "react";
import { KIWorkspace } from "@/components/ki-workspace/KIWorkspace";
import { COCKPIT_REPORTS } from "@/components/ki-workspace/reports/registry";
import type { ReportRunner } from "@/components/ki-workspace/types";

interface Props {
  userId: string;
}

const REPORT_PATHS = [
  "@/lib/ki-workspace/reports/pipeline-snapshot",
  "@/lib/ki-workspace/reports/top-chancen",
  "@/lib/ki-workspace/reports/conversion-rate",
  "@/lib/ki-workspace/reports/forecast",
  "@/lib/ki-workspace/reports/winloss-aggregate",
  "@/lib/ki-workspace/reports/stagnierende-deals",
] as const;

type ReportPath = (typeof REPORT_PATHS)[number];

function isKnownPath(path: string): path is ReportPath {
  return (REPORT_PATHS as readonly string[]).includes(path);
}

export function CockpitKIWorkspace({ userId }: Props) {
  const loadRunner = useCallback(async (path: string): Promise<ReportRunner> => {
    if (!isKnownPath(path)) {
      throw new Error(`Unknown report path: ${path}`);
    }
    switch (path) {
      case "@/lib/ki-workspace/reports/pipeline-snapshot": {
        const m = await import("@/lib/ki-workspace/reports/pipeline-snapshot");
        return m.runReport;
      }
      case "@/lib/ki-workspace/reports/top-chancen": {
        const m = await import("@/lib/ki-workspace/reports/top-chancen");
        return m.runReport;
      }
      case "@/lib/ki-workspace/reports/conversion-rate": {
        const m = await import("@/lib/ki-workspace/reports/conversion-rate");
        return m.runReport;
      }
      case "@/lib/ki-workspace/reports/forecast": {
        const m = await import("@/lib/ki-workspace/reports/forecast");
        return m.runReport;
      }
      case "@/lib/ki-workspace/reports/winloss-aggregate": {
        const m = await import("@/lib/ki-workspace/reports/winloss-aggregate");
        return m.runReport;
      }
      case "@/lib/ki-workspace/reports/stagnierende-deals": {
        const m = await import("@/lib/ki-workspace/reports/stagnierende-deals");
        return m.runReport;
      }
    }
  }, []);

  return (
    <KIWorkspace
      context="cockpit"
      reports={COCKPIT_REPORTS}
      scope={{ userId }}
      voiceEnabled={true}
      loadRunner={loadRunner}
    />
  );
}
