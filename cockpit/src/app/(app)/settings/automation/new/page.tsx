import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  getPipelines,
  getPipelineStages,
} from "@/app/(app)/pipeline/actions";
import { getEmailTemplates } from "@/app/(app)/settings/template-actions";
import { RuleBuilder } from "../_components/rule-builder";
import type { SaveAutomationRuleInput } from "@/types/automation";
import type {
  StageOption,
  PipelineOption,
} from "../_components/step-trigger";

export const dynamic = "force-dynamic";

const EMPTY_DRAFT: SaveAutomationRuleInput = {
  name: "",
  description: null,
  status: "paused",
  trigger_event: "deal.stage_changed",
  trigger_config: {},
  conditions: [],
  actions: [],
};

export default async function NewAutomationRulePage() {
  const pipelines = await getPipelines();
  const stagesByPipeline = await Promise.all(
    pipelines.map((p) => getPipelineStages(p.id))
  );
  const stages: StageOption[] = stagesByPipeline.flatMap((arr, i) =>
    arr.map((s) => ({
      id: s.id,
      pipeline_id: pipelines[i].id,
      name: s.name,
    }))
  );
  const pipelineOpts: PipelineOption[] = pipelines.map((p) => ({
    id: p.id,
    name: p.name,
  }));
  const templates = await getEmailTemplates();

  return (
    <main className="px-8 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/settings/automation"
            className={`${buttonVariants({ variant: "ghost", size: "sm" })} mb-2 inline-flex gap-1`}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Zurueck
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            Neue Workflow-Regel
          </h1>
          <p className="text-sm text-muted-foreground">
            4 Schritte: Trigger waehlen → Bedingungen → Aktionen → Aktivieren.
          </p>
        </div>
      </div>

      <RuleBuilder
        initial={EMPTY_DRAFT}
        pipelines={pipelineOpts}
        stages={stages}
        emailTemplates={templates.map((t) => ({ id: t.id, title: t.title }))}
      />
    </main>
  );
}
