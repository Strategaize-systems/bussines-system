"use client";

// V8 SLC-813 MT-4 — StageRequirementsModal (FEAT-804).
//
// Generic Modal-Komponente fuer alle 5 STAGE_REQUIRED_FIELDS-Stages (DEC-222).
// Wird vom Kanban-Drop-Handler geoeffnet, wenn der Drag-Drop auf eine Ziel-
// Stage faellt, fuer die der Deal Pflichtfeld-Luecken hat.
//
// KI-Vorschlag (DEC-220) wird nur bei `won_lost_reason`-Pflichtfeld pre-filled.
// Andere Pflichtfeld-Stages (Won/Verhandlung/Angebot) zeigen einen Info-Hint
// "KI-Vorschlag nur fuer Verlustgrund verfuegbar".

import * as React from "react";
import { Sparkles, AlertCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type {
  StageRequirementField,
  StageRequirementSpec,
} from "@/lib/pipeline/stage-required-fields";

export interface StageRequirementsContact {
  id: string;
  first_name: string;
  last_name: string;
}

export interface KiLossSuggest {
  primary: string;
  alternatives: string[];
}

export interface StageRequirementsModalProps {
  open: boolean;
  dealTitle: string;
  oldStageName: string;
  newStageName: string;
  requirements: StageRequirementSpec;
  currentValues: Partial<Record<StageRequirementField, string | number | null>>;
  contacts: readonly StageRequirementsContact[];
  /** Nur gesetzt bei Stage "Verloren" wenn `won_lost_reason` fehlt. */
  kiSuggest?: KiLossSuggest | null;
  /** "loading" wenn KI-Call laeuft, sonst undefined. */
  kiSuggestStatus?: "loading" | "ready" | "unavailable";
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onConfirm: (
    values: Partial<Record<StageRequirementField, string | number>>
  ) => void | Promise<void>;
  onCancel: () => void;
}

const inputClass =
  "block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4454b8] disabled:bg-slate-50 disabled:text-slate-500";
const selectClass = inputClass;
const textareaClass =
  "block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#4454b8] disabled:bg-slate-50 disabled:text-slate-500";

export function StageRequirementsModal({
  open,
  dealTitle,
  oldStageName,
  newStageName,
  requirements,
  currentValues,
  contacts,
  kiSuggest = null,
  kiSuggestStatus = "ready",
  isSubmitting = false,
  errorMessage = null,
  onConfirm,
  onCancel,
}: StageRequirementsModalProps) {
  const [values, setValues] = React.useState<
    Record<StageRequirementField, string | number | "">
  >(() => buildInitialValues(requirements, currentValues, kiSuggest));

  // Bei Re-Open (neuer Drag): State zuruecksetzen, damit alte Werte nicht
  // persistieren.
  React.useEffect(() => {
    if (open) {
      setValues(buildInitialValues(requirements, currentValues, kiSuggest));
    }
    // requirements/currentValues/kiSuggest aendern sich nur mit "open" zusammen,
    // daher reicht der "open"-Reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const missingField = requirements.fields.find((f) => isEmpty(values[f]));
  const confirmDisabled = !!missingField || isSubmitting;

  function setField(field: StageRequirementField, val: string | number | "") {
    setValues((prev) => ({ ...prev, [field]: val }));
  }

  async function handleConfirm() {
    const payload: Partial<Record<StageRequirementField, string | number>> = {};
    for (const field of requirements.fields) {
      const v = values[field];
      if (v !== "") payload[field] = v as string | number;
    }
    await onConfirm(payload);
  }

  const showLossReasonField =
    requirements.fields.includes("won_lost_reason");
  const showKiSuggestHint =
    !showLossReasonField && requirements.fields.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        data-testid="stage-requirements-modal"
        className="sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#4454b8]" />
            Pflichtfelder fuer Stage-Wechsel
          </DialogTitle>
          <DialogDescription>
            Deal &quot;{dealTitle}&quot;: {oldStageName} → {newStageName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {requirements.fields.map((field) => (
            <div key={field} className="space-y-1.5" data-testid={`field-${field}`}>
              <Label htmlFor={`req-${field}`}>{requirements.labels[field]}</Label>

              {field === "value" && (
                <div className="relative">
                  <input
                    id="req-value"
                    type="number"
                    min={0}
                    step={100}
                    inputMode="numeric"
                    value={values.value === "" ? "" : String(values.value)}
                    onChange={(e) =>
                      setField(
                        "value",
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    disabled={isSubmitting}
                    className={`${inputClass} pr-12`}
                    placeholder="0"
                    data-testid="req-input-value"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    EUR
                  </span>
                </div>
              )}

              {field === "contact_id" && (
                <select
                  id="req-contact_id"
                  value={values.contact_id === "" ? "" : String(values.contact_id)}
                  onChange={(e) => setField("contact_id", e.target.value)}
                  disabled={isSubmitting}
                  className={selectClass}
                  data-testid="req-input-contact_id"
                >
                  <option value="">— Kontakt waehlen —</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </option>
                  ))}
                </select>
              )}

              {field === "won_lost_reason" && (
                <>
                  <textarea
                    id="req-won_lost_reason"
                    rows={4}
                    value={
                      values.won_lost_reason === ""
                        ? ""
                        : String(values.won_lost_reason)
                    }
                    onChange={(e) =>
                      setField("won_lost_reason", e.target.value)
                    }
                    disabled={isSubmitting || kiSuggestStatus === "loading"}
                    className={textareaClass}
                    placeholder={
                      kiSuggestStatus === "loading"
                        ? "KI sucht Verlustgrund-Hinweis ..."
                        : "Kurzer Verlustgrund (1-2 Saetze)"
                    }
                    data-testid="req-input-won_lost_reason"
                  />
                  {kiSuggest && kiSuggestStatus === "ready" && (
                    <div
                      className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900"
                      data-testid="ki-suggest-hint"
                    >
                      <p className="font-semibold mb-1 flex items-center gap-1.5">
                        <Sparkles size={12} /> KI-Vorschlag (Quelle in
                        Klammern)
                      </p>
                      {kiSuggest.alternatives.length > 0 && (
                        <details className="mt-2">
                          <summary
                            className="cursor-pointer text-blue-700 hover:text-blue-900"
                            data-testid="ki-suggest-alternatives-toggle"
                          >
                            Andere Vorschlaege ({kiSuggest.alternatives.length})
                          </summary>
                          <ul
                            className="mt-2 space-y-1 pl-3"
                            data-testid="ki-suggest-alternatives"
                          >
                            {kiSuggest.alternatives.map((alt, idx) => (
                              <li key={idx}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setField("won_lost_reason", alt)
                                  }
                                  className="text-left text-blue-700 underline hover:text-blue-900"
                                >
                                  {alt}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  )}
                  {kiSuggestStatus === "unavailable" && (
                    <p
                      className="text-xs text-slate-500"
                      data-testid="ki-suggest-unavailable"
                    >
                      KI-Vorschlag mangels Activity-History nicht verfuegbar.
                    </p>
                  )}
                </>
              )}
            </div>
          ))}

          {showKiSuggestHint && (
            <p
              className="text-xs text-slate-500"
              data-testid="ki-suggest-hint-other-stages"
            >
              KI-Vorschlag nur fuer Verlustgrund verfuegbar.
            </p>
          )}

          {errorMessage && (
            <div
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-start gap-2"
              data-testid="stage-req-error"
            >
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            data-testid="stage-req-cancel"
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={confirmDisabled}
            data-testid="stage-req-confirm"
            className="bg-gradient-to-r from-[#120774] to-[#4454b8] text-white hover:from-[#0f0660] hover:to-[#3a48a0]"
          >
            {isSubmitting ? "Verschiebe ..." : "Verschieben"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function buildInitialValues(
  requirements: StageRequirementSpec,
  currentValues: Partial<Record<StageRequirementField, string | number | null>>,
  kiSuggest: KiLossSuggest | null
): Record<StageRequirementField, string | number | ""> {
  const result: Record<StageRequirementField, string | number | ""> = {
    value: "",
    contact_id: "",
    won_lost_reason: "",
  };
  for (const field of requirements.fields) {
    const cur = currentValues[field];
    if (cur !== null && cur !== undefined && cur !== "") {
      result[field] = cur;
    }
  }
  // KI-Suggest nur dann pre-fill wenn das Feld leer war.
  if (
    kiSuggest &&
    requirements.fields.includes("won_lost_reason") &&
    result.won_lost_reason === ""
  ) {
    result.won_lost_reason = kiSuggest.primary;
  }
  return result;
}

function isEmpty(v: string | number | ""): boolean {
  if (v === "") return true;
  if (typeof v === "string") return v.trim() === "";
  return false;
}
