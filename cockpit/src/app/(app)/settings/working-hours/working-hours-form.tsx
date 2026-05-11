"use client";

// SLC-667 MT-7 — Form fuer Working-Hours.

import { useState, useTransition } from "react";
import { TimePicker } from "@/components/ui/time-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  updateWorkingHoursSettings,
  type WorkingHoursSettings,
} from "@/lib/settings/working-hours-actions";

interface Props {
  initial: WorkingHoursSettings;
}

export function WorkingHoursForm({ initial }: Props) {
  const [start, setStart] = useState(initial.start ?? "");
  const [end, setEnd] = useState(initial.end ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await updateWorkingHoursSettings({
        start: start || null,
        end: end || null,
      });
      if (!result.ok) {
        setError(result.error ?? "Speichern fehlgeschlagen");
        return;
      }
      setSuccess(true);
    });
  }

  function handleReset() {
    setStart("");
    setEnd("");
    setError(null);
    setSuccess(false);
  }

  return (
    <div className="space-y-4" data-testid="working-hours-form">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="working-hours-start">Start</Label>
          <TimePicker
            id="working-hours-start"
            value={start}
            onChange={setStart}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="working-hours-end">Ende</Label>
          <TimePicker
            id="working-hours-end"
            value={end}
            onChange={setEnd}
          />
        </div>
      </div>

      {error && (
        <p
          role="alert"
          data-testid="working-hours-error"
          className="text-sm text-red-600"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          data-testid="working-hours-success"
          className="text-sm text-emerald-700"
        >
          Gespeichert.
        </p>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          data-testid="working-hours-save"
        >
          {isPending ? "Speichern…" : "Speichern"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={isPending}
          data-testid="working-hours-reset"
        >
          Leeren
        </Button>
      </div>

      <p className="text-xs text-slate-500">
        Standardbereich des Kalenders ist 06:00–21:00. Working-Hours legen den
        hervorgehobenen Arbeitstag-Bereich fest.
      </p>
    </div>
  );
}
