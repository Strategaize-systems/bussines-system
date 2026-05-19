"use client";

// V7.6 SLC-763 MT-2 — Save-Custom-Report-Modal.
//
// Pattern-Reuse:
//   - Native HTML Form + useTransition (feedback_native_html_form_pattern).
//   - shadcn-Dialog-Pattern aus apply-confirm-modal.tsx (V7.5 SLC-754).
//   - 409-Conflict-Mapping aus dem saveCustomReport-Server-Action
//     ({ ok:false, code:"duplicate_name" }).
//
// Trigger: AnswerPane-"Als Bericht speichern"-Button (SLC-763 MT-1) ruft den
// onSaveAsReport-Callback im KIWorkspace, der den Modal-Open-State togglet
// (controlled). Modal speichert die aktuelle freie Frage als Custom-Report.

import * as React from "react";
import { AlertTriangle, BookmarkPlus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { saveCustomReport } from "@/lib/custom-reports/actions/save";
import type { CustomReportContextType } from "@/lib/custom-reports/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Aktueller Input-Text aus dem KIWorkspace (Freie-Frage-Text). */
  promptTemplate: string;
  /** Vom Workspace-Wrapper passend gesetzt (`mein-tag` oder `cockpit`). */
  contextType: CustomReportContextType;
  /** Wird nach Save-Success aufgerufen — Parent triggert dann `router.refresh()`. */
  onSaved: (id: string) => void;
}

export function SaveCustomReportModal({
  open,
  onOpenChange,
  promptTemplate,
  contextType,
  onSaved,
}: Props) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  // Reset bei jedem Oeffnen.
  React.useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setErrorMessage(null);
    }
  }, [open]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      setErrorMessage("Name muss 2-80 Zeichen lang sein.");
      return;
    }

    startTransition(async () => {
      const res = await saveCustomReport({
        name: trimmedName,
        prompt_template: promptTemplate,
        context_type: contextType,
        description: description.trim() ? description.trim() : null,
      });
      if (res.ok) {
        onSaved(res.id);
        onOpenChange(false);
        return;
      }
      if (res.code === "duplicate_name") {
        setErrorMessage("Name bereits vergeben. Bitte einen anderen Namen waehlen.");
        return;
      }
      setErrorMessage(res.message ?? "Speichern fehlgeschlagen.");
    });
  }

  const submitDisabled = isPending || name.trim().length < 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="save-custom-report-modal" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkPlus size={16} className="text-brand-primary" />
            Als Bericht speichern
          </DialogTitle>
          <DialogDescription>
            Speichere die aktuelle Frage als wiederverwendbaren Bericht — sie
            erscheint danach unter &quot;Meine Berichte&quot;.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          data-testid="save-custom-report-form"
          className="space-y-3"
        >
          <div>
            <label
              htmlFor="save-custom-report-name"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Name <span className="text-red-600">*</span>
            </label>
            <input
              id="save-custom-report-name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              required
              minLength={2}
              maxLength={80}
              placeholder="z.B. Stagnierende Deals 14d"
              data-testid="save-custom-report-name"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="save-custom-report-description"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Beschreibung <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="save-custom-report-description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending}
              maxLength={500}
              rows={2}
              placeholder="Kurze Notiz, wofuer du diesen Bericht nutzt."
              data-testid="save-custom-report-description"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <input type="hidden" name="prompt_template" value={promptTemplate} />
          <input type="hidden" name="context_type" value={contextType} />

          {errorMessage && (
            <div
              role="alert"
              data-testid="save-custom-report-error"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-start gap-2"
            >
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              data-testid="save-custom-report-cancel"
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={submitDisabled}
              data-testid="save-custom-report-submit"
              className="bg-brand-primary text-brand-foreground hover:bg-brand-primary-dark"
            >
              {isPending ? "Speichere..." : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
