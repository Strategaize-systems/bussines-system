import { getPipelines, getPipelineStages } from "../pipeline/actions";
import { StagesConfig } from "./stages-config";
import { getCurrentUserRole } from "@/lib/audit";
import { Shield } from "lucide-react";
import type { PipelineStage } from "../pipeline/actions";

export default async function SettingsPage() {
  const [pipelines, role] = await Promise.all([
    getPipelines(),
    getCurrentUserRole(),
  ]);

  // Load stages for all pipelines
  const stagesResults = await Promise.all(
    pipelines.map((p) => getPipelineStages(p.id))
  );

  const stagesByPipeline: Record<string, PipelineStage[]> = {};
  pipelines.forEach((p, i) => {
    stagesByPipeline[p.id] = stagesResults[i];
  });

  const roleLabel = role === "admin" ? "Administrator" : "Operator";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Einstellungen</h1>
        <p className="text-sm text-muted-foreground">
          Pipeline-Stages konfigurieren und Profil verwalten
        </p>
      </div>

      {/* Role display */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
            <Shield className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">Deine Rolle</p>
            <p className="text-sm text-slate-500">{roleLabel}</p>
          </div>
        </div>
      </div>

      <StagesConfig pipelines={pipelines} stagesByPipeline={stagesByPipeline} />
    </div>
  );
}
