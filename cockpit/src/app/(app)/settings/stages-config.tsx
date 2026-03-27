"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import {
  createStage,
  updateStage,
  deleteStage,
} from "../pipeline/actions";
import type { Pipeline, PipelineStage } from "../pipeline/actions";

interface StagesConfigProps {
  pipelines: Pipeline[];
  stagesByPipeline: Record<string, PipelineStage[]>;
}

export function StagesConfig({ pipelines, stagesByPipeline }: StagesConfigProps) {
  return (
    <div className="space-y-6">
      {pipelines.map((pipeline) => (
        <PipelineStagesCard
          key={pipeline.id}
          pipeline={pipeline}
          stages={stagesByPipeline[pipeline.id] || []}
        />
      ))}
    </div>
  );
}

function PipelineStagesCard({
  pipeline,
  stages,
}: {
  pipeline: Pipeline;
  stages: PipelineStage[];
}) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{pipeline.name} — Stages</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="mr-2 h-4 w-4" />
            Stage hinzufügen
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {stages.map((stage) => (
          <StageRow key={stage.id} stage={stage} />
        ))}
        {stages.length === 0 && (
          <p className="text-sm text-muted-foreground">Keine Stages konfiguriert.</p>
        )}
        {showAdd && (
          <AddStageForm pipelineId={pipeline.id} onDone={() => setShowAdd(false)} />
        )}
      </CardContent>
    </Card>
  );
}

function StageRow({ stage }: { stage: PipelineStage }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleUpdate = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateStage(stage.id, formData);
      if (!result.error) setEditing(false);
    });
  };

  const handleDelete = () => {
    if (!confirm(`Stage "${stage.name}" wirklich löschen? Deals in dieser Stage verlieren ihre Zuordnung.`)) return;
    startTransition(async () => {
      await deleteStage(stage.id);
    });
  };

  if (editing) {
    return (
      <form action={handleUpdate} className="flex items-center gap-2 rounded-md border p-2">
        <input
          type="color"
          name="color"
          defaultValue={stage.color || "#6366f1"}
          className="h-8 w-8 cursor-pointer rounded border-0 p-0"
        />
        <Input name="name" defaultValue={stage.name} className="h-8 flex-1" required />
        <Input
          name="probability"
          type="number"
          defaultValue={stage.probability}
          className="h-8 w-16"
          min={0}
          max={100}
          title="Wahrscheinlichkeit %"
        />
        <Button type="submit" size="sm" variant="outline" disabled={isPending}>
          OK
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
          ✕
        </Button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md border p-2">
      <div
        className="h-4 w-4 rounded-full"
        style={{ backgroundColor: stage.color || "#6366f1" }}
      />
      <span className="flex-1 text-sm font-medium">{stage.name}</span>
      <span className="text-xs text-muted-foreground">{stage.probability}%</span>
      <Button size="sm" variant="ghost" onClick={() => setEditing(true)} disabled={isPending}>
        Bearbeiten
      </Button>
      <Button size="sm" variant="ghost" onClick={handleDelete} disabled={isPending}>
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  );
}

function AddStageForm({
  pipelineId,
  onDone,
}: {
  pipelineId: string;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await createStage(formData);
      if (!result.error) onDone();
    });
  };

  return (
    <form action={handleSubmit} className="flex items-center gap-2 rounded-md border border-dashed p-2">
      <input type="hidden" name="pipeline_id" value={pipelineId} />
      <input
        type="color"
        name="color"
        defaultValue="#6366f1"
        className="h-8 w-8 cursor-pointer rounded border-0 p-0"
      />
      <Input name="name" placeholder="Stage-Name" className="h-8 flex-1" required />
      <Input
        name="probability"
        type="number"
        defaultValue={0}
        className="h-8 w-16"
        min={0}
        max={100}
        placeholder="%"
      />
      <Button type="submit" size="sm" disabled={isPending}>
        Hinzufügen
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDone}>
        ✕
      </Button>
    </form>
  );
}
