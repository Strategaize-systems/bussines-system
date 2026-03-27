import { getPipelines, getPipelineStages } from "../pipeline/actions";
import { StagesConfig } from "./stages-config";
import type { PipelineStage } from "../pipeline/actions";

export default async function SettingsPage() {
  const pipelines = await getPipelines();

  // Load stages for all pipelines
  const stagesResults = await Promise.all(
    pipelines.map((p) => getPipelineStages(p.id))
  );

  const stagesByPipeline: Record<string, PipelineStage[]> = {};
  pipelines.forEach((p, i) => {
    stagesByPipeline[p.id] = stagesResults[i];
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Einstellungen</h1>
        <p className="text-sm text-muted-foreground">
          Pipeline-Stages konfigurieren
        </p>
      </div>

      <StagesConfig pipelines={pipelines} stagesByPipeline={stagesByPipeline} />
    </div>
  );
}
