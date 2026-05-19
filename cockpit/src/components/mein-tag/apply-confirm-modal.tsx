"use client";

// V7.5 SLC-754 MT-4 — Apply-Confirmation-Modal fuer NL-Rule-Builder.
//
// Reuse shadcn Dialog (`@/components/ui/dialog`, base-ui-Dialog). Zeigt:
//   - Klarsprache-Echo (read-only, aus Trigger + erste Action heuristisch)
//   - Trigger-Event-Label
//   - Action-Liste-Label (alle Actions, nicht nur erste)
//   - Pflicht-Checkbox "Ich bestaetige..."
//   - Cancel + Apply-Button (Apply disabled bis Checkbox aktiv und nicht-pending)
//
// On-Apply-Klick ruft `onApply` Callback — Parent (NLBuilderInline V7.6, vor
// V7.6 NLRuleBuilderCard) ruft die applyNlRule-Server-Action und schliesst das
// Modal nach Success.
//
// Per DEC-207: Pflicht-Checkbox darf NICHT geskipped werden. UI ist bewusst
// reibungsvoll — User muss aktiv bestaetigen, dass die Regel auf alle
// zukuenftigen Stage-Wechsel angewandt wird.

import * as React from "react";
import { AlertTriangle, Sparkles } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import type { SculptSuccess } from "@/lib/automation/sculptor-schema";

const TRIGGER_LABEL: Record<SculptSuccess["trigger_event"], string> = {
  "deal.stage_changed": "einem Stage-Wechsel eines Deals",
  "deal.created": "einem neuen Deal",
  "activity.created": "einer neuen Aktivitaet",
};

function actionSummary(action: SculptSuccess["actions"][number]): string {
  switch (action.type) {
    case "create_task":
      return `Aufgabe anlegen: "${action.params.title}"`;
    case "send_email_template":
      return `E-Mail-Vorlage versenden (${action.params.mode === "draft" ? "Entwurf" : "direkt"})`;
    case "create_activity":
      return `Aktivitaet (${action.params.type}) anlegen: "${action.params.title}"`;
    case "update_field":
      return `Feld aktualisieren: ${action.params.entity}.${action.params.field}`;
  }
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema: SculptSuccess;
  onApply: () => void;
  isApplying: boolean;
  errorMessage?: string | null;
}

export function ApplyConfirmModal({
  open,
  onOpenChange,
  schema,
  onApply,
  isApplying,
  errorMessage,
}: Props) {
  const [checked, setChecked] = React.useState(false);

  // Reset Checkbox jedes Mal, wenn Modal neu geoeffnet wird.
  React.useEffect(() => {
    if (!open) setChecked(false);
  }, [open]);

  const applyDisabled = !checked || isApplying;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="apply-confirm-modal" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#4454b8]" />
            Regel aktivieren?
          </DialogTitle>
          <DialogDescription>
            Diese Regel wird ab jetzt automatisch ausgefuehrt, wenn das definierte
            Ereignis eintritt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div
            data-testid="apply-confirm-trigger"
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
          >
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Ausloeser
            </p>
            <p className="text-sm text-slate-800">
              Bei {TRIGGER_LABEL[schema.trigger_event] ?? schema.trigger_event}
            </p>
          </div>

          <div
            data-testid="apply-confirm-actions"
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
          >
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Aktionen
            </p>
            <ul className="space-y-0.5 text-sm text-slate-800">
              {schema.actions.map((action, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-[#4454b8] mt-0.5">→</span>
                  <span>{actionSummary(action)}</span>
                </li>
              ))}
            </ul>
          </div>

          <label
            data-testid="apply-confirm-checkbox-label"
            className="flex items-start gap-2 cursor-pointer rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
          >
            <input
              type="checkbox"
              data-testid="apply-confirm-checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              disabled={isApplying}
              className="mt-0.5 h-4 w-4 rounded border-amber-400 text-[#4454b8] focus:ring-[#4454b8]"
            />
            <span className="text-xs text-amber-900">
              Ich bestaetige: Diese Regel wird ab jetzt auf alle neuen Ereignisse
              angewandt.
            </span>
          </label>

          {errorMessage && (
            <div
              data-testid="apply-confirm-error"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-start gap-2"
            >
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isApplying}
            data-testid="apply-confirm-cancel"
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={onApply}
            disabled={applyDisabled}
            data-testid="apply-confirm-submit"
            className="bg-gradient-to-r from-[#120774] to-[#4454b8] text-white hover:from-[#0f0660] hover:to-[#3a48a0]"
          >
            {isApplying ? "Aktiviere..." : "Regel aktivieren"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
