"use client";

import { useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { setOptOutCommunication } from "@/app/actions/consent";

type Props = {
  contactId: string;
  initial: boolean;
};

export function OptOutToggle({ contactId, initial }: Props) {
  const [checked, setChecked] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(next: boolean) {
    const prev = checked;
    setChecked(next);
    setError(null);
    startTransition(async () => {
      const result = await setOptOutCommunication(contactId, next);
      if (result.error) {
        setChecked(prev);
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <input
          id={`opt-out-${contactId}`}
          type="checkbox"
          checked={checked}
          disabled={pending}
          onChange={(e) => toggle(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        <Label
          htmlFor={`opt-out-${contactId}`}
          className="text-sm font-normal"
        >
          Keine Kommunikation senden
        </Label>
      </div>
      <p className="text-xs text-muted-foreground pl-6">
        Erinnerungen, Follow-up-Mails und andere automatische Kommunikation an
        diesen Kontakt unterdruecken.
      </p>
      {error && <p className="pl-6 text-xs text-red-700">{error}</p>}
    </div>
  );
}
