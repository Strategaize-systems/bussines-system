import { getPipelines, getPipelineStages } from "../../pipeline/actions";
import { PipelineConfig } from "../pipeline-config";
import type { PipelineStage } from "../../pipeline/actions";
import { assertRole } from "@/lib/auth/assert-role";

export const dynamic = "force-dynamic";

export default async function PipelinesSettingsPage() {
  await assertRole(["admin"]);
  const pipelines = await getPipelines();

  const stagesResults = await Promise.all(
    pipelines.map((p) => getPipelineStages(p.id))
  );

  const stagesByPipeline: Record<string, PipelineStage[]> = {};
  pipelines.forEach((p, i) => {
    stagesByPipeline[p.id] = stagesResults[i];
  });

  return (
    <main className="px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pipelines & Stages</h1>
        <p className="text-sm text-muted-foreground">
          Pipelines anlegen, Stages konfigurieren und Reihenfolge festlegen.
        </p>
      </div>

      <PipelineConfig pipelines={pipelines} stagesByPipeline={stagesByPipeline} />
    </main>
  );
}
