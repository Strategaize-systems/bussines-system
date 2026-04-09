"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { DealForm } from "@/app/(app)/pipeline/deal-form";
import {
  updateDeal,
  deleteDeal,
  moveDealToPipeline,
} from "@/app/(app)/pipeline/actions";
import type { PipelineStage, Pipeline } from "@/app/(app)/pipeline/actions";
import { InsightSheet } from "@/components/insights/insight-sheet";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DealEditProps {
  deal: any;
  stages: PipelineStage[];
  pipelines: Pipeline[];
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  referrals: { id: string; label: string }[];
}

export function DealEdit({
  deal,
  stages,
  pipelines,
  contacts,
  companies,
  referrals,
}: DealEditProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateDeal(deal.id, formData);
      if (!result.error) {
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("Deal wirklich löschen?")) return;
    startTransition(async () => {
      const result = await deleteDeal(deal.id);
      if (!result.error) {
        router.push("/pipeline");
      }
    });
  };

  const handleMovePipeline = (targetPipelineId: string) => {
    startTransition(async () => {
      const result = await moveDealToPipeline(deal.id, targetPipelineId);
      if (!result.error) {
        router.refresh();
      }
    });
  };

  const otherPipelines = pipelines.filter((p) => p.id !== deal.pipeline_id);

  return (
    <div className="max-w-2xl space-y-6">
      <DealForm
        deal={deal}
        stages={stages}
        pipelineId={deal.pipeline_id}
        contacts={contacts}
        companies={companies}
        referrals={referrals}
        onSubmit={handleSubmit}
        isPending={isPending}
      />

      {/* Insight Button for won/lost deals */}
      {(deal.status === "won" || deal.status === "lost") && (
        <div className="border-t pt-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[#f2b705]">
            Insight
          </p>
          <InsightSheet
            sourceType="deal"
            sourceId={deal.id}
            sourceTitle={`${deal.title} (${deal.status === "won" ? "Gewonnen" : "Verloren"})`}
            sourceContent={
              deal.won_lost_reason
                ? `Grund: ${deal.won_lost_reason}`
                : undefined
            }
          />
        </div>
      )}

      {/* Move to Pipeline */}
      {otherPipelines.length > 0 && (
        <div className="border-t pt-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[#4454b8]">
            In andere Pipeline verschieben
          </p>
          <div className="flex gap-2">
            {otherPipelines.map((p) => (
              <Button
                key={p.id}
                size="sm"
                variant="outline"
                className="text-xs"
                disabled={isPending}
                onClick={() => handleMovePipeline(p.id)}
              >
                &rarr; {p.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Delete */}
      <div className="border-t pt-4">
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={handleDelete}
          disabled={isPending}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Deal löschen
        </Button>
      </div>
    </div>
  );
}
