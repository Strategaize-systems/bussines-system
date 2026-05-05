"use client";

import { useState, useTransition } from "react";
import { Play, Save, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runDryRun } from "../actions";
import type { SaveAutomationRuleInput } from "@/types/automation";
import type { DryRunResult } from "@/lib/automation/dry-run";
import { DryRunResultView } from "./dry-run-result";

export function StepActivate({
  draft,
  saving,
  onSave,
}: {
  draft: SaveAutomationRuleInput;
  saving: boolean;
  onSave: (status: "active" | "paused") => void;
}) {
  const [dryResult, setDryResult] = useState<DryRunResult | null>(null);
  const [dryError, setDryError] = useState<string | null>(null);
  const [isDrying, startDry] = useTransition();

  function performDryRun() {
    setDryError(null);
    startDry(async () => {
      const r = await runDryRun(draft, 30);
      if (!r.ok) setDryError(r.error);
      else setDryResult(r.result);
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-medium text-slate-900">
          Aktivieren oder Trockenlauf
        </h3>
        <p className="text-sm text-slate-500">
          Speichere als Entwurf (pausiert) oder aktiviere die Regel direkt.
          Trockenlauf zeigt, was die Regel in den letzten 30 Tagen getriggert
          haette — ohne tatsaechlich auszufuehren.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
        <p className="text-sm font-medium text-slate-900">
          Zusammenfassung
        </p>
        <ul className="text-xs text-slate-600 space-y-0.5">
          <li>
            Name: <strong>{draft.name || "(noch leer)"}</strong>
          </li>
          <li>Trigger: {draft.trigger_event}</li>
          <li>
            Bedingungen: {draft.conditions.length}{" "}
            {draft.conditions.length === 1 ? "Bedingung" : "Bedingungen"}
          </li>
          <li>
            Aktionen: {draft.actions.length}{" "}
            {draft.actions.length === 1 ? "Aktion" : "Aktionen"}
          </li>
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={performDryRun}
          disabled={isDrying || draft.actions.length === 0}
          className="gap-2"
        >
          <Search className="h-4 w-4" />
          {isDrying ? "Trockenlauf..." : "Trockenlauf 30 Tage"}
        </Button>
        <Button
          variant="outline"
          onClick={() => onSave("paused")}
          disabled={saving || draft.actions.length === 0 || !draft.name.trim()}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          Als Entwurf speichern
        </Button>
        <Button
          onClick={() => onSave("active")}
          disabled={saving || draft.actions.length === 0 || !draft.name.trim()}
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          Speichern und aktivieren
        </Button>
      </div>

      {dryError ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {dryError}
        </div>
      ) : null}
      {isDrying ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
          Trockenlauf laeuft, bitte warten...
        </div>
      ) : null}
      {dryResult ? <DryRunResultView result={dryResult} /> : null}
    </div>
  );
}
