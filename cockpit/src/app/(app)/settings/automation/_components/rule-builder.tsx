"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, X, Smartphone } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { saveAutomationRule } from "../actions";
import type {
  SaveAutomationRuleInput,
  TriggerEvent,
  TriggerConfig,
} from "@/types/automation";
import { StepIndicator } from "./step-indicator";
import {
  StepTrigger,
  type PipelineOption,
  type StageOption,
} from "./step-trigger";
import { StepConditions } from "./step-conditions";
import { StepActions } from "./step-actions";
import { StepActivate } from "./step-activate";
import type { EmailTemplateOption } from "./actions/send-email-template-form";

export function RuleBuilder({
  initial,
  pipelines,
  stages,
  emailTemplates,
}: {
  initial: SaveAutomationRuleInput;
  pipelines: PipelineOption[];
  stages: StageOption[];
  emailTemplates: EmailTemplateOption[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<SaveAutomationRuleInput>(initial);
  const [step, setStep] = useState(1);
  const [dirty, setDirty] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 768px)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  function patch(p: Partial<SaveAutomationRuleInput>) {
    setDraft((prev) => ({ ...prev, ...p }));
    setDirty(true);
  }

  function tryCancel() {
    if (dirty) setConfirmCancel(true);
    else router.push("/settings/automation");
  }

  function performSave(targetStatus: "active" | "paused") {
    setError(null);
    const payload: SaveAutomationRuleInput = { ...draft, status: targetStatus };
    startSave(async () => {
      const r = await saveAutomationRule(payload);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push("/settings/automation");
      router.refresh();
    });
  }

  if (isMobile) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
            <Smartphone className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">
              Builder fuer Desktop optimiert
            </p>
            <p className="text-xs text-slate-500">
              Der 4-Step-Builder benoetigt mehr Platz. Oeffne diese Seite an
              einem Desktop oder Tablet im Querformat.
            </p>
          </div>
        </div>
        <a
          href="/settings/automation"
          className={`${buttonVariants({ variant: "outline" })} inline-flex gap-2`}
        >
          <ArrowLeft className="h-4 w-4" />
          Zurueck zum Listing
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StepIndicator currentStep={step} onJumpToStep={setStep} />

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {step === 1 ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label className="text-xs">Name der Regel</Label>
                <Input
                  value={draft.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder="z.B. Onboarding bei Stage 'Gewonnen'"
                />
              </div>
              <div>
                <Label className="text-xs">
                  Beschreibung (optional, fuer Doku)
                </Label>
                <Textarea
                  rows={2}
                  value={draft.description ?? ""}
                  onChange={(e) =>
                    patch({ description: e.target.value || null })
                  }
                />
              </div>
            </div>
            <StepTrigger
              triggerEvent={draft.trigger_event}
              triggerConfig={draft.trigger_config}
              pipelines={pipelines}
              stages={stages}
              onChange={(event: TriggerEvent, config: TriggerConfig) =>
                patch({ trigger_event: event, trigger_config: config })
              }
            />
          </div>
        ) : null}

        {step === 2 ? (
          <StepConditions
            triggerEvent={draft.trigger_event}
            conditions={draft.conditions}
            onChange={(c) => patch({ conditions: c })}
          />
        ) : null}

        {step === 3 ? (
          <StepActions
            actions={draft.actions}
            emailTemplates={emailTemplates}
            onChange={(a) => patch({ actions: a })}
          />
        ) : null}

        {step === 4 ? (
          <StepActivate
            draft={draft}
            saving={saving}
            onSave={performSave}
          />
        ) : null}

        {error ? (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={tryCancel}
          className="gap-2 text-slate-600"
        >
          <X className="h-4 w-4" />
          Abbrechen
        </Button>
        <div className="flex gap-2">
          {step > 1 ? (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurueck
            </Button>
          ) : null}
          {step < 4 ? (
            <Button
              onClick={() => setStep(step + 1)}
              className="gap-2"
              disabled={
                (step === 1 && !draft.name.trim()) ||
                (step === 3 && draft.actions.length === 0)
              }
            >
              Weiter
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <Dialog
        open={confirmCancel}
        onOpenChange={(open) => {
          if (!open) setConfirmCancel(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aenderungen verwerfen?</DialogTitle>
            <DialogDescription>
              Du hast ungespeicherte Aenderungen. Wenn du jetzt abbrichst,
              gehen sie verloren.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmCancel(false)}
            >
              Weiter bearbeiten
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmCancel(false);
                router.push("/settings/automation");
              }}
            >
              Verwerfen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
