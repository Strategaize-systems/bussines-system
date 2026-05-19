"use client";

import { useCallback, useMemo } from "react";
import { KIWorkspace } from "@/components/ki-workspace/KIWorkspace";
import { MEIN_TAG_REPORTS } from "@/components/ki-workspace/reports/registry";
import type { ReportRunner } from "@/components/ki-workspace/types";

interface Props {
  userId: string;
  /**
   * V7.6 SLC-761 — Sichtbarkeit des 6. Reports "nl-builder" ist auf
   * admin/teamlead beschraenkt. Server-Side resolved in page.tsx
   * (`profile.role === "admin" || profile.role === "teamlead"`).
   * Member sehen 5 Standard-Reports, Admin/Teamlead 6 (inkl. "Workflow bauen").
   */
  canSculpt: boolean;
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

export function MeinTagKIWorkspace({ userId, canSculpt }: Props) {
  // V7.6 SLC-761 MT-2 — Filtert den NL-Builder-Button per Role-Gate. Damit
  // ist die Sichtbarkeit primaer im UI-Layer geloest; die Server-Actions
  // (sculptNlRule/previewNlRule/applyNlRule) gaten zusaetzlich auf Role
  // (Defense-in-Depth, siehe AUDIT_SERVER_ACTIONS_V7.md Section 11).
  const reports = useMemo(
    () =>
      canSculpt
        ? MEIN_TAG_REPORTS
        : MEIN_TAG_REPORTS.filter((r) => r.id !== "nl-builder"),
    [canSculpt],
  );

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
        reports={reports}
        scope={{ userId }}
        voiceEnabled={true}
        loadRunner={loadRunner}
      />
    </div>
  );
}
