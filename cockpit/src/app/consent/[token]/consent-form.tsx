"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { declineConsent, grantConsent } from "@/app/actions/consent";

export function ConsentForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handle(action: "grant" | "decline") {
    setError(null);
    startTransition(async () => {
      const result =
        action === "grant" ? await grantConsent(token) : await declineConsent(token);
      if (result.ok) {
        router.push(`/consent/${token}/confirmed?outcome=${action}`);
        return;
      }
      if (result.error === "rate_limited") {
        setError("Zu viele Anfragen. Bitte spaeter erneut versuchen.");
      } else if (result.error === "expired") {
        setError("Der Einwilligungs-Link ist abgelaufen.");
      } else if (result.error === "not_found") {
        setError("Link nicht gefunden.");
      } else {
        setError("Aktion fehlgeschlagen. Bitte erneut versuchen.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Button
          onClick={() => handle("grant")}
          disabled={pending}
          className="bg-green-600 hover:bg-green-700"
        >
          Einwilligung erteilen
        </Button>
        <Button
          onClick={() => handle("decline")}
          disabled={pending}
          variant="outline"
        >
          Ablehnen
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
