"use client";

// V7.6 SLC-761 MT-3 — NL-Rule-Builder Inline-Variante im KI-Workspace.
// Pattern 1:1 portiert aus V7.5 cockpit/src/components/mein-tag/nl-rule-builder-card.tsx
// (DEC-213). Unterschiede zur V7.5-Card:
//   - OHNE Card-Wrapper-Box (kein doppelter Container im Workspace-Render).
//   - OHNE Cost-Display + OHNE Modell-Hint (DEC-214 + feedback_nl_builder_belongs_in_workspace,
//     User-Direktive 2026-05-18: "Cost+Modell raus aus User-UI"). Forensik bleibt im
//     audit_log + V7.5 Inspection-Log /settings/workflow-automation/nl-history (SLC-756).
//   - onClose-Prop (KIWorkspace wechselt Mode zurueck auf "report" nach Apply-Success).
//   - canSculpt-Sichtbarkeit erfolgt im ki-workspace-wrapper.tsx (Role-Filter),
//     daher kein canSculpt-Prop noetig. Server-Actions gaten zusaetzlich.
//
// Sub-Komponenten-Reuse aus V7.5 (bleiben in components/mein-tag/):
//   - PreviewResultCard
//   - ApplyConfirmModal

import * as React from "react";
import { Sparkles, Mic, Square, AlertTriangle, Wand2, Plus, X, TestTube2 } from "lucide-react";

import { useVoiceCapture } from "@/components/ki-workspace/hooks/useVoiceCapture";

import { sculptNlRule, type SculptNlRuleResult } from "@/app/(app)/mein-tag/actions/sculpt-nl-rule";
import { previewNlRule } from "@/app/(app)/mein-tag/actions/preview-nl-rule";
import { applyNlRule } from "@/app/(app)/mein-tag/actions/apply-nl-rule";
import type { SculptResult } from "@/lib/automation/sculptor";
import type { SculptSuccess } from "@/lib/automation/sculptor-schema";
import type { DryRunResult } from "@/lib/automation/dry-run";
import type { Condition, ConditionOp } from "@/types/automation";

import { PreviewResultCard } from "@/components/mein-tag/preview-result-card";
import { ApplyConfirmModal } from "@/components/mein-tag/apply-confirm-modal";

// ---------------------------------------------------------------------------
// Klarsprache-Echo (heuristisch aus Trigger + erste Action)
// ---------------------------------------------------------------------------

const TRIGGER_LABEL: Record<SculptSuccess["trigger_event"], string> = {
  "deal.stage_changed": "Stage-Wechsel eines Deals",
  "deal.created": "neuem Deal",
  "activity.created": "neuer Aktivitaet",
};

const ACTION_LABEL: Record<string, string> = {
  create_task: "wird eine Folge-Aufgabe erstellt",
  send_email_template: "wird eine E-Mail versendet",
  create_activity: "wird eine Aktivitaet protokolliert",
  update_field: "wird ein Feld aktualisiert",
};

function buildClarSprache(payload: SculptSuccess): string {
  const trigger = TRIGGER_LABEL[payload.trigger_event] ?? payload.trigger_event;
  const firstAction = payload.actions[0];
  const action = ACTION_LABEL[firstAction?.type] ?? "wird eine Aktion ausgefuehrt";
  return `Bei ${trigger} ${action}.`;
}

// ---------------------------------------------------------------------------
// Editable Schema State (local React state — kein Server-Roundtrip beim Edit)
// ---------------------------------------------------------------------------

interface EditableSchema {
  triggerEvent: SculptSuccess["trigger_event"];
  conditions: Array<{ field: string; op: string; value: string }>;
  actionType: string;
  actionTitle: string;
}

const TRIGGER_OPTIONS: ReadonlyArray<{ value: SculptSuccess["trigger_event"]; label: string }> = [
  { value: "deal.stage_changed", label: "Deal: Phase geaendert" },
  { value: "deal.created", label: "Deal: Neu erstellt" },
  { value: "activity.created", label: "Aktivitaet: Neu erstellt" },
];

const ACTION_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "create_task", label: "Aufgabe erstellen" },
  { value: "send_email_template", label: "E-Mail-Vorlage senden" },
  { value: "create_activity", label: "Aktivitaet protokollieren" },
  { value: "update_field", label: "Feld aktualisieren" },
];

function payloadToSchema(payload: SculptSuccess): EditableSchema {
  const a0 = payload.actions[0];
  const title =
    a0?.type === "create_task" || a0?.type === "create_activity"
      ? a0.params.title ?? ""
      : "";
  return {
    triggerEvent: payload.trigger_event,
    conditions: payload.conditions.map((c) => ({
      field: c.field,
      op: c.op,
      value: typeof c.value === "string" ? c.value : JSON.stringify(c.value ?? ""),
    })),
    actionType: a0?.type ?? "create_task",
    actionTitle: title,
  };
}

function buildCurrentSchema(
  payload: SculptSuccess,
  edits: EditableSchema
): SculptSuccess {
  const original = payload.actions[0];

  let firstAction: SculptSuccess["actions"][number];
  if (edits.actionType === "create_task") {
    firstAction = {
      type: "create_task",
      params: {
        title: edits.actionTitle || "Aufgabe",
        ...(original?.type === "create_task" && {
          due_in_days: original.params.due_in_days,
          assignee: original.params.assignee,
        }),
      },
    };
  } else if (edits.actionType === "create_activity") {
    firstAction = {
      type: "create_activity",
      params: {
        type:
          original?.type === "create_activity" ? original.params.type : "note",
        title: edits.actionTitle || "Aktivitaet",
      },
    };
  } else if (
    edits.actionType === "send_email_template" &&
    original?.type === "send_email_template"
  ) {
    firstAction = original;
  } else if (
    edits.actionType === "update_field" &&
    original?.type === "update_field"
  ) {
    firstAction = original;
  } else {
    firstAction = original ?? {
      type: "create_task",
      params: { title: edits.actionTitle || "Aufgabe" },
    };
  }

  return {
    name: payload.name,
    description: payload.description ?? null,
    trigger_event: edits.triggerEvent,
    trigger_config: payload.trigger_config,
    conditions: edits.conditions.map<Condition>((c) => ({
      field: c.field,
      op: c.op as ConditionOp,
      value: c.value,
    })),
    actions: [firstAction, ...payload.actions.slice(1)],
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  /**
   * Wird nach Apply-Success aufgerufen. KIWorkspace nutzt dies um den
   * mode-State zurueck auf "report" zu setzen.
   */
  onClose: () => void;
}

export function NLBuilderInline({ onClose }: Props) {
  const [nlInput, setNlInput] = React.useState("");
  const [actionResult, setActionResult] = React.useState<SculptNlRuleResult | null>(null);
  const [editableSchema, setEditableSchema] = React.useState<EditableSchema | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const [previewResult, setPreviewResult] = React.useState<DryRunResult | null>(null);
  const [previewError, setPreviewError] = React.useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [applyError, setApplyError] = React.useState<string | null>(null);
  const [applyLoading, setApplyLoading] = React.useState(false);

  const voice = useVoiceCapture();
  const handleVoiceClick = React.useCallback(async () => {
    if (voice.isRecording) {
      const text = await voice.stop();
      if (text) {
        setNlInput((prev) => (prev ? `${prev} ${text}` : text));
      }
    } else {
      await voice.start();
    }
  }, [voice]);

  const sculptResult: SculptResult | null = actionResult?.ok ? actionResult.result : null;
  const sculptPayload: SculptSuccess | null =
    sculptResult && sculptResult.status === "success" ? sculptResult.payload : null;
  const sculptSessionId: string | null = sculptResult?.sessionId ?? null;
  const sculptCostUsd = sculptResult?.totalCostUsd ?? 0;

  const editedInForm = React.useMemo(() => {
    if (!sculptPayload || !editableSchema) return false;
    const original = payloadToSchema(sculptPayload);
    return JSON.stringify(original) !== JSON.stringify(editableSchema);
  }, [sculptPayload, editableSchema]);

  function resetDerivedState() {
    setPreviewResult(null);
    setPreviewError(null);
    setApplyError(null);
    setModalOpen(false);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (nlInput.trim().length === 0) return;
    const fd = new FormData();
    fd.set("nlInput", nlInput);
    resetDerivedState();
    startTransition(async () => {
      const res = await sculptNlRule(fd);
      setActionResult(res);
      if (res.ok && res.result.status === "success") {
        setEditableSchema(payloadToSchema(res.result.payload));
      } else {
        setEditableSchema(null);
      }
    });
  }

  async function handlePreview() {
    if (!sculptPayload || !editableSchema) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const currentSchema = buildCurrentSchema(sculptPayload, editableSchema);
      const res = await previewNlRule(currentSchema);
      if (res.ok) {
        setPreviewResult(res.result);
      } else {
        setPreviewError(res.message);
      }
    } catch (e) {
      setPreviewError(`Trockenlauf fehlgeschlagen: ${(e as Error).message}`);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleApply() {
    if (!sculptPayload || !editableSchema || !sculptSessionId) return;
    setApplyLoading(true);
    setApplyError(null);
    try {
      const currentSchema = buildCurrentSchema(sculptPayload, editableSchema);
      const res = await applyNlRule({
        schema: currentSchema,
        nl_input: nlInput,
        sculpt_audit_id: sculptSessionId,
        sculptor_cost_usd: sculptCostUsd,
        edited_in_form: editedInForm,
      });
      if (res.ok) {
        handleNewRule();
        onClose();
      } else {
        setApplyError(res.message);
      }
    } catch (e) {
      setApplyError(`Apply fehlgeschlagen: ${(e as Error).message}`);
    } finally {
      setApplyLoading(false);
    }
  }

  function handleNewRule() {
    setNlInput("");
    setActionResult(null);
    setEditableSchema(null);
    resetDerivedState();
  }

  const currentSchemaForModal: SculptSuccess | null =
    sculptPayload && editableSchema
      ? buildCurrentSchema(sculptPayload, editableSchema)
      : null;

  return (
    <>
      <div
        data-testid="nl-builder-inline"
        className="space-y-4"
      >
        {/* KARTE 1: NL-Eingabe */}
        <form onSubmit={handleSubmit} data-testid="nl-builder-inline-form">
          <label htmlFor="nl-builder-inline-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Regel beschreiben
          </label>
          <div className="relative">
            <textarea
              id="nl-builder-inline-input"
              name="nlInput"
              value={nlInput}
              onChange={(e) => setNlInput(e.target.value)}
              disabled={isPending}
              rows={3}
              placeholder='Beispiel: "Wenn ein Deal in Phase Angebot bewegt wird, leg mir in 2 Tagen eine Follow-up-Aufgabe an."'
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-all outline-none placeholder:text-slate-400 hover:border-slate-400 focus:border-[#4454b8] focus:ring-2 focus:ring-[#4454b8]/10 focus:shadow-md disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleVoiceClick}
              disabled={isPending}
              aria-pressed={voice.isRecording}
              aria-label={voice.isRecording ? "Aufnahme stoppen" : "Spracheingabe starten"}
              title={voice.isRecording ? "Aufnahme stoppen" : "Spracheingabe starten"}
              data-testid="nl-builder-inline-mic"
              className={
                "absolute right-2 top-2 inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50 " +
                (voice.isRecording
                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                  : "bg-slate-100 text-slate-500 hover:bg-[#4454b8]/10 hover:text-[#4454b8]")
              }
            >
              {voice.isRecording ? <Square size={14} className="fill-current" /> : <Mic size={14} />}
            </button>
          </div>

          <div className="mt-3 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={isPending || nlInput.trim().length === 0}
              data-testid="nl-builder-inline-submit"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#120774] to-[#4454b8] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-[#0f0660] hover:to-[#3a48a0] disabled:cursor-not-allowed disabled:opacity-50 transition-all"
            >
              <Wand2 size={14} />
              {isPending ? "Regel wird gebaut..." : "Regel bauen"}
            </button>
          </div>
        </form>

        {actionResult && !actionResult.ok && (
          <div
            data-testid="nl-builder-inline-action-error"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-start gap-2"
          >
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{actionResult.message}</span>
          </div>
        )}

        {voice.error && (
          <div
            data-testid="nl-builder-inline-voice-error"
            role="status"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-start gap-2"
          >
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{voice.error}</span>
          </div>
        )}

        {sculptResult && sculptResult.status === "success" && editableSchema && (
          <>
            <div
              data-testid="nl-builder-inline-clarsprache"
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
            >
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Du moechtest folgende Regel
              </p>
              <p className="text-sm text-slate-800">{buildClarSprache(sculptResult.payload)}</p>
            </div>

            <div data-testid="nl-builder-inline-schema" className="rounded-lg border-2 border-[#4454b8]/30 bg-white px-4 py-3 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wide mb-1">
                  Ausloeser
                </label>
                <select
                  value={editableSchema.triggerEvent}
                  onChange={(e) =>
                    setEditableSchema((prev) =>
                      prev
                        ? { ...prev, triggerEvent: e.target.value as SculptSuccess["trigger_event"] }
                        : prev,
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 hover:border-slate-400 focus:border-[#4454b8] focus:ring-2 focus:ring-[#4454b8]/10 outline-none"
                >
                  {TRIGGER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                    Bedingungen
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditableSchema((prev) =>
                        prev
                          ? {
                              ...prev,
                              conditions: [...prev.conditions, { field: "", op: "eq", value: "" }],
                            }
                          : prev,
                      )
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4454b8] hover:text-[#120774]"
                  >
                    <Plus size={12} /> Bedingung
                  </button>
                </div>
                {editableSchema.conditions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Keine Bedingungen.</p>
                ) : (
                  <div className="space-y-1.5">
                    {editableSchema.conditions.map((c, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={c.field}
                          onChange={(e) =>
                            setEditableSchema((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    conditions: prev.conditions.map((it, i) =>
                                      i === idx ? { ...it, field: e.target.value } : it,
                                    ),
                                  }
                                : prev,
                            )
                          }
                          placeholder="Feld (z.B. deal.value)"
                          className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs"
                        />
                        <select
                          value={c.op}
                          onChange={(e) =>
                            setEditableSchema((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    conditions: prev.conditions.map((it, i) =>
                                      i === idx ? { ...it, op: e.target.value } : it,
                                    ),
                                  }
                                : prev,
                            )
                          }
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                        >
                          <option value="eq">=</option>
                          <option value="neq">!=</option>
                          <option value="gt">&gt;</option>
                          <option value="lt">&lt;</option>
                          <option value="gte">&gt;=</option>
                          <option value="lte">&lt;=</option>
                          <option value="contains">enthaelt</option>
                        </select>
                        <input
                          type="text"
                          value={c.value}
                          onChange={(e) =>
                            setEditableSchema((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    conditions: prev.conditions.map((it, i) =>
                                      i === idx ? { ...it, value: e.target.value } : it,
                                    ),
                                  }
                                : prev,
                            )
                          }
                          placeholder="Wert"
                          className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs"
                        />
                        <button
                          type="button"
                          aria-label="Bedingung entfernen"
                          onClick={() =>
                            setEditableSchema((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    conditions: prev.conditions.filter((_, i) => i !== idx),
                                  }
                                : prev,
                            )
                          }
                          className="text-slate-400 hover:text-red-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wide mb-1">
                  Aktion
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <select
                    value={editableSchema.actionType}
                    onChange={(e) =>
                      setEditableSchema((prev) =>
                        prev ? { ...prev, actionType: e.target.value } : prev,
                      )
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900"
                  >
                    {ACTION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={editableSchema.actionTitle}
                    onChange={(e) =>
                      setEditableSchema((prev) =>
                        prev ? { ...prev, actionTitle: e.target.value } : prev,
                      )
                    }
                    placeholder="Titel / Beschreibung"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900"
                  />
                </div>
              </div>
            </div>

            {!previewResult && (
              <div
                data-testid="nl-builder-inline-preview-cta"
                className="rounded-lg border border-slate-200 bg-white px-4 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <TestTube2 size={14} className="text-[#4454b8]" />
                  Pruefe die Regel im Trockenlauf gegen die letzten 7 Tage.
                </div>
                <button
                  type="button"
                  data-testid="nl-builder-inline-preview-button"
                  onClick={handlePreview}
                  disabled={previewLoading}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {previewLoading ? "Pruefe..." : "Trockenlauf anzeigen"}
                </button>
              </div>
            )}

            {previewError && (
              <div
                data-testid="nl-builder-inline-preview-error"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700 flex items-start gap-2"
              >
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{previewError}</span>
              </div>
            )}

            {previewResult && (
              <>
                <PreviewResultCard result={previewResult} />
                <div
                  data-testid="nl-builder-inline-apply-cta"
                  className="rounded-lg border border-slate-200 bg-white px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Sparkles size={14} className="text-[#4454b8]" />
                    Aktiviere die Regel — sie wird ab sofort automatisch ausgefuehrt.
                  </div>
                  <button
                    type="button"
                    data-testid="nl-builder-inline-apply-button"
                    onClick={() => {
                      setApplyError(null);
                      setModalOpen(true);
                    }}
                    disabled={applyLoading}
                    className="rounded-lg bg-gradient-to-r from-[#120774] to-[#4454b8] px-3 py-1.5 text-xs font-semibold text-white hover:from-[#0f0660] hover:to-[#3a48a0] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Regel aktivieren
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {sculptResult && sculptResult.status === "reject" && (
          <div
            data-testid="nl-builder-inline-reject"
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5"
          >
            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
              <AlertTriangle size={12} /> Nicht als Workflow umsetzbar
            </p>
            <p className="text-sm text-amber-900">{sculptResult.reason.explanation}</p>
            <p className="text-[11px] text-amber-700 mt-1.5">
              Tipp: Versuche den klassischen Click-Wizard fuer komplexere Faelle.
            </p>
          </div>
        )}

        {sculptResult && sculptResult.status === "validation_fail" && (
          <div
            data-testid="nl-builder-inline-validation-fail"
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5"
          >
            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
              <AlertTriangle size={12} /> Konnte keine eindeutige Regel ableiten
            </p>
            <p className="text-sm text-amber-900">
              Bitte verfeinere deine Beschreibung — z.B. mit Phase, Frist oder konkretem
              Aktions-Typ. Letzter Hinweis: {sculptResult.lastError}
            </p>
          </div>
        )}

        {sculptResult && sculptResult.status === "infra_fail" && (
          <div
            data-testid="nl-builder-inline-infra-fail"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5"
          >
            <p className="text-[11px] font-semibold text-red-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
              <AlertTriangle size={12} /> KI-Aufruf fehlgeschlagen
            </p>
            <p className="text-sm text-red-800">{sculptResult.infraError}</p>
          </div>
        )}
      </div>

      {currentSchemaForModal && (
        <ApplyConfirmModal
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) setApplyError(null);
          }}
          schema={currentSchemaForModal}
          onApply={handleApply}
          isApplying={applyLoading}
          errorMessage={applyError}
        />
      )}
    </>
  );
}
