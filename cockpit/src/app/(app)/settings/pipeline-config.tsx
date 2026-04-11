"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Pencil, Check, X, GitBranch, ChevronDown, ChevronUp, Lock } from "lucide-react";
import {
  createPipeline,
  updatePipeline,
  deletePipeline,
  createStage,
  updateStage,
  deleteStage,
} from "../pipeline/actions";
import type { Pipeline, PipelineStage } from "../pipeline/actions";

// Built-in pipeline names (must match PIPELINE_SLUGS in actions.ts)
const BUILT_IN_NAMES = new Set(["Multiplikatoren", "Unternehmer-Chancen", "Lead-Management"]);

interface PipelineConfigProps {
  pipelines: Pipeline[];
  stagesByPipeline: Record<string, PipelineStage[]>;
}

export function PipelineConfig({ pipelines, stagesByPipeline }: PipelineConfigProps) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Pipelines</h2>
          <p className="text-sm text-muted-foreground">
            Pipelines erstellen, umbenennen und Stages verwalten
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreate(!showCreate)}
          className="bg-gradient-to-r from-[#120774] to-[#4454b8] text-white hover:shadow-lg"
        >
          <Plus className="mr-2 h-4 w-4" />
          Neue Pipeline
        </Button>
      </div>

      {showCreate && (
        <CreatePipelineCard onDone={() => setShowCreate(false)} />
      )}

      {pipelines.map((pipeline) => (
        <PipelineCard
          key={pipeline.id}
          pipeline={pipeline}
          stages={stagesByPipeline[pipeline.id] || []}
        />
      ))}
    </div>
  );
}

function CreatePipelineCard({ onDone }: { onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const result = await createPipeline(formData);
      if (result.error) {
        setError(result.error);
      } else {
        onDone();
        router.refresh();
      }
    });
  };

  return (
    <Card className="border-dashed border-2 border-[#4454b8]/30">
      <CardContent className="pt-6">
        <form action={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Input
              name="name"
              placeholder="Pipeline-Name (z.B. Partner-Akquise)"
              className="h-10"
              required
              autoFocus
            />
            <Input
              name="description"
              placeholder="Beschreibung (optional)"
              className="h-10"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Standard-Stages werden automatisch erstellt (Qualifizierung → Gewonnen/Verloren). Du kannst sie danach anpassen.
          </p>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Erstelle..." : "Pipeline erstellen"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onDone}>
              Abbrechen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PipelineCard({
  pipeline,
  stages,
}: {
  pipeline: Pipeline;
  stages: PipelineStage[];
}) {
  const isBuiltIn = BUILT_IN_NAMES.has(pipeline.name);
  const [editing, setEditing] = useState(false);
  const [showStages, setShowStages] = useState(false);
  const [showAddStage, setShowAddStage] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  const handleRename = (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const result = await updatePipeline(pipeline.id, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setEditing(false);
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`Pipeline "${pipeline.name}" wirklich löschen? Alle Stages werden ebenfalls gelöscht.`)) return;
    setError("");
    startTransition(async () => {
      const result = await deletePipeline(pipeline.id);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        {error && <p className="text-sm text-destructive mb-2">{error}</p>}

        {editing ? (
          <form action={handleRename} className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-[#4454b8] shrink-0" />
            <Input
              name="name"
              defaultValue={pipeline.name}
              className="h-8 flex-1"
              required
              autoFocus
            />
            <Input
              name="description"
              defaultValue={pipeline.description ?? ""}
              placeholder="Beschreibung"
              className="h-8 flex-1"
            />
            <Button type="submit" size="sm" variant="outline" disabled={isPending}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GitBranch className="h-4 w-4 text-[#4454b8]" />
              <div>
                <CardTitle className="text-base">{pipeline.name}</CardTitle>
                {pipeline.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{pipeline.description}</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">
                {stages.length} Stages
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isBuiltIn && (
                <span className="text-xs text-muted-foreground flex items-center gap-1 mr-1" title="System-Pipeline — kann nicht umbenannt oder gelöscht werden">
                  <Lock className="h-3 w-3" />
                  System
                </span>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowStages(!showStages)}
                className="text-xs"
              >
                Stages
                {showStages ? <ChevronUp className="ml-1 h-3.5 w-3.5" /> : <ChevronDown className="ml-1 h-3.5 w-3.5" />}
              </Button>
              {!isBuiltIn && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(true)} disabled={isPending}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleDelete} disabled={isPending}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardHeader>

      {showStages && (
        <CardContent className="pt-0 space-y-2">
          <div className="border-t border-slate-100 pt-3">
            {stages.map((stage) => (
              <StageRow key={stage.id} stage={stage} />
            ))}
            {stages.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">Keine Stages konfiguriert.</p>
            )}
            {showAddStage ? (
              <AddStageForm
                pipelineId={pipeline.id}
                onDone={() => setShowAddStage(false)}
              />
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddStage(true)}
                className="mt-2"
              >
                <Plus className="mr-2 h-3.5 w-3.5" />
                Stage hinzufügen
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function StageRow({ stage }: { stage: PipelineStage }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  const handleUpdate = (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const result = await updateStage(stage.id, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setEditing(false);
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`Stage "${stage.name}" wirklich löschen? Deals in dieser Stage verlieren ihre Zuordnung.`)) return;
    setError("");
    startTransition(async () => {
      const result = await deleteStage(stage.id);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  if (editing) {
    return (
      <form action={handleUpdate} className="flex flex-col gap-1 rounded-md border p-2 mb-1">
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex items-center gap-2">
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
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => { setEditing(false); setError(""); }}>
          <X className="h-3.5 w-3.5" />
        </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-1 rounded-md border p-2 mb-1">
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center gap-2">
      <div
        className="h-4 w-4 rounded-full shrink-0"
        style={{ backgroundColor: stage.color || "#6366f1" }}
      />
      <span className="flex-1 text-sm font-medium">{stage.name}</span>
      <span className="text-xs text-muted-foreground">{stage.probability}%</span>
      <Button size="sm" variant="ghost" onClick={() => setEditing(true)} disabled={isPending}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" onClick={handleDelete} disabled={isPending}>
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
      </div>
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
  const router = useRouter();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await createStage(formData);
      if (!result.error) {
        onDone();
        router.refresh();
      }
    });
  };

  return (
    <form action={handleSubmit} className="flex items-center gap-2 rounded-md border border-dashed p-2 mt-1">
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
        <X className="h-3.5 w-3.5" />
      </Button>
    </form>
  );
}
