"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { revokeConsentPublic } from "@/app/actions/consent";

export function RevokeForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handle() {
    setError(null);
    startTransition(async () => {
      const result = await revokeConsentPublic(token);
      if (result.ok) {
        router.push(`/consent/${token}/confirmed?outcome=revoke`);
        return;
      }
      if (result.error === "rate_limited") {
        setError("Zu viele Anfragen. Bitte spaeter erneut versuchen.");
      } else if (result.error === "not_found") {
        setError("Link nicht gefunden.");
      } else {
        setError("Aktion fehlgeschlagen. Bitte erneut versuchen.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={handle}
        disabled={pending}
        className="bg-red-600 hover:bg-red-700"
      >
        Einwilligung widerrufen
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
