"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  TriggerEvent,
  TriggerConfig,
} from "@/types/automation";

export interface PipelineOption {
  id: string;
  name: string;
}
export interface StageOption {
  id: string;
  pipeline_id: string;
  name: string;
}

const ACTIVITY_TYPES = ["call", "email", "meeting", "note", "task", "briefing"];

export function StepTrigger({
  triggerEvent,
  triggerConfig,
  pipelines,
  stages,
  onChange,
}: {
  triggerEvent: TriggerEvent;
  triggerConfig: TriggerConfig;
  pipelines: PipelineOption[];
  stages: StageOption[];
  onChange: (event: TriggerEvent, config: TriggerConfig) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-medium text-slate-900">
          Wann soll diese Regel ausgeloest werden?
        </h3>
        <p className="text-sm text-slate-500">
          Waehle eine der drei System-Events.
        </p>
      </div>

      <div className="space-y-2">
        {[
          {
            event: "deal.stage_changed" as TriggerEvent,
            label: "Wenn Deal in Stage wechselt",
            description:
              "z.B. fuer Onboarding-Aufgabe bei Stage 'Gewonnen' oder Follow-up bei Stage 'Angebot offen'.",
          },
          {
            event: "deal.created" as TriggerEvent,
            label: "Wenn neuer Deal erstellt wird",
            description:
              "Reagiere auf neu angelegte Opportunities — z.B. Tagging oder Begruessungs-Mail.",
          },
          {
            event: "activity.created" as TriggerEvent,
            label: "Wenn neue Activity erstellt wird",
            description:
              "Reagiere auf Calls, Meetings, Notizen — z.B. Folgeaufgabe nach Anruf.",
          },
        ].map((opt) => {
          const checked = triggerEvent === opt.event;
          return (
            <button
              key={opt.event}
              type="button"
              onClick={() => onChange(opt.event, {})}
              className={`block w-full text-left rounded-lg border p-3 transition-colors ${
                checked
                  ? "border-amber-500 bg-amber-50"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                    checked
                      ? "border-amber-500 bg-amber-500"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {checked ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  ) : null}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {opt.label}
                  </p>
                  <p className="text-xs text-slate-500">{opt.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Sub-Forms je Trigger */}
      {triggerEvent === "deal.stage_changed" ? (
        <DealStageChangedSubForm
          config={triggerConfig as { pipeline_id?: string; stage_id?: string }}
          pipelines={pipelines}
          stages={stages}
          onChange={(c) => onChange(triggerEvent, c)}
        />
      ) : null}
      {triggerEvent === "deal.created" ? (
        <DealCreatedSubForm
          config={triggerConfig as { pipeline_id?: string }}
          pipelines={pipelines}
          onChange={(c) => onChange(triggerEvent, c)}
        />
      ) : null}
      {triggerEvent === "activity.created" ? (
        <ActivityCreatedSubForm
          config={triggerConfig as { activity_types?: string[] }}
          onChange={(c) => onChange(triggerEvent, c)}
        />
      ) : null}
    </div>
  );
}

function DealStageChangedSubForm({
  config,
  pipelines,
  stages,
  onChange,
}: {
  config: { pipeline_id?: string; stage_id?: string };
  pipelines: PipelineOption[];
  stages: StageOption[];
  onChange: (c: { pipeline_id?: string; stage_id?: string }) => void;
}) {
  const filteredStages = config.pipeline_id
    ? stages.filter((s) => s.pipeline_id === config.pipeline_id)
    : [];

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
      <p className="text-xs text-slate-600">
        Optional einschraenken auf eine bestimmte Pipeline + Stage. Leer
        lassen = alle Stage-Wechsel triggern.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Pipeline</Label>
          <Select
            value={config.pipeline_id ?? "__any__"}
            onValueChange={(v) => {
              const val = v ?? "__any__";
              onChange({
                pipeline_id: val === "__any__" ? undefined : val,
                stage_id: undefined,
              });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__any__">Alle Pipelines</SelectItem>
              {pipelines.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Stage (Ziel)</Label>
          <Select
            value={config.stage_id ?? "__any__"}
            onValueChange={(v) => {
              const val = v ?? "__any__";
              onChange({
                ...config,
                stage_id: val === "__any__" ? undefined : val,
              });
            }}
            disabled={!config.pipeline_id}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__any__">Alle Stages</SelectItem>
              {filteredStages.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function DealCreatedSubForm({
  config,
  pipelines,
  onChange,
}: {
  config: { pipeline_id?: string };
  pipelines: PipelineOption[];
  onChange: (c: { pipeline_id?: string }) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
      <p className="text-xs text-slate-600">
        Optional einschraenken auf eine Pipeline.
      </p>
      <Label className="text-xs">Pipeline</Label>
      <Select
        value={config.pipeline_id ?? "__any__"}
        onValueChange={(v) => {
          const val = v ?? "__any__";
          onChange({ pipeline_id: val === "__any__" ? undefined : val });
        }}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__any__">Alle Pipelines</SelectItem>
          {pipelines.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ActivityCreatedSubForm({
  config,
  onChange,
}: {
  config: { activity_types?: string[] };
  onChange: (c: { activity_types?: string[] }) => void;
}) {
  const selected = new Set(config.activity_types ?? []);
  function toggle(t: string) {
    const next = new Set(selected);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    onChange({ activity_types: Array.from(next) });
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
      <p className="text-xs text-slate-600">
        Optional einschraenken auf Activity-Typen. Leer lassen = alle.
      </p>
      <div className="flex flex-wrap gap-2">
        {ACTIVITY_TYPES.map((t) => {
          const isOn = selected.has(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              className={`rounded-full px-3 py-1 text-xs ${
                isOn
                  ? "bg-amber-500 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}
