import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  getPipelines,
  getPipelineStages,
} from "@/app/(app)/pipeline/actions";
import { getEmailTemplates } from "@/app/(app)/settings/template-actions";
import { listAutomationRules } from "../../actions";
import { RuleBuilder } from "../../_components/rule-builder";
import type { SaveAutomationRuleInput } from "@/types/automation";
import type {
  StageOption,
  PipelineOption,
} from "../../_components/step-trigger";

export const dynamic = "force-dynamic";

export default async function EditAutomationRulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [pipelines, templates, rules] = await Promise.all([
    getPipelines(),
    getEmailTemplates(),
    listAutomationRules(),
  ]);
  const rule = rules.find((r) => r.id === id);
  if (!rule) notFound();

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

  const initial: SaveAutomationRuleInput = {
    id: rule.id,
    name: rule.name,
    description: rule.description,
    status: rule.status,
    trigger_event: rule.trigger_event,
    trigger_config: rule.trigger_config,
    conditions: rule.conditions,
    actions: rule.actions,
  };

  return (
    <main className="px-8 py-8 space-y-6">
      <div>
        <Link
          href="/settings/automation"
          className={`${buttonVariants({ variant: "ghost", size: "sm" })} mb-2 inline-flex gap-1`}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Zurueck
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Regel bearbeiten
        </h1>
        <p className="text-sm text-muted-foreground">{rule.name}</p>
      </div>

      <RuleBuilder
        initial={initial}
        pipelines={pipelineOpts}
        stages={stages}
        emailTemplates={templates.map((t) => ({ id: t.id, title: t.title }))}
      />
    </main>
  );
}
