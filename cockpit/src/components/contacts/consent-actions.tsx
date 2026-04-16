"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  createConsentRequest,
  revokeConsentManual,
} from "@/app/actions/consent";
import type { ConsentStatus } from "@/app/(app)/contacts/actions";

type Props = {
  contactId: string;
  status: ConsentStatus;
  hasEmail: boolean;
  requestedAt: string | null;
};

export function ConsentActions({
  contactId,
  status,
  hasEmail,
  requestedAt,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const pendingAge = daysSince(requestedAt);
  const showRenewalHint =
    status === "pending" && pendingAge !== null && pendingAge >= 7;

  function requestConsent() {
    setMessage(null);
    startTransition(async () => {
      const result = await createConsentRequest(contactId);
      if (result.error) {
        setMessage({ kind: "error", text: result.error });
      } else {
        setMessage({ kind: "ok", text: "Einwilligungsanfrage versendet." });
      }
    });
  }

  function revokeNow() {
    setMessage(null);
    const confirmed = window.confirm(
      "Einwilligung wirklich widerrufen? Diese Aktion wird im Audit-Log protokolliert."
    );
    if (!confirmed) return;
    startTransition(async () => {
      const result = await revokeConsentManual(contactId);
      if (result.error) {
        setMessage({ kind: "error", text: result.error });
      } else {
        setMessage({ kind: "ok", text: "Einwilligung widerrufen." });
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={requestConsent}
          disabled={pending || !hasEmail}
        >
          {status === "granted"
            ? "Erneut anfragen"
            : "Einwilligung anfragen"}
        </Button>
        {status === "granted" && (
          <Button
            size="sm"
            variant="outline"
            onClick={revokeNow}
            disabled={pending}
            className="text-red-700 hover:text-red-800"
          >
            Widerrufen
          </Button>
        )}
      </div>
      {!hasEmail && (
        <p className="text-xs text-muted-foreground">
          Kontakt hat keine E-Mail-Adresse — Anfrage nicht moeglich.
        </p>
      )}
      {showRenewalHint && (
        <p className="text-xs text-amber-700">
          Anfrage seit {pendingAge} Tagen offen. Erneut senden?
        </p>
      )}
      {message && (
        <p
          className={
            message.kind === "ok"
              ? "text-xs text-green-700"
              : "text-xs text-red-700"
          }
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
}
