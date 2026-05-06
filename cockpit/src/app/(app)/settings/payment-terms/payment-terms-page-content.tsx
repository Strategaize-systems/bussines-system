"use client";

import { useState } from "react";
import { Receipt, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PaymentTermsTemplate } from "@/types/proposal-payment";
import { PaymentTermsManager } from "./payment-terms-manager";

export function PaymentTermsPageContent({
  initialTemplates,
}: {
  initialTemplates: PaymentTermsTemplate[];
}) {
  const [createNonce, setCreateNonce] = useState(0);

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Zahlungsbedingungen
          </h1>
          <p className="text-sm text-muted-foreground">
            Vorlagen fuer typische Zahlungsbedingungen, die im Angebot-Editor per
            Dropdown auswaehlbar sind.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setCreateNonce((c) => c + 1)}
          className="gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Neue Vorlage
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
            <Receipt className="h-4 w-4 text-emerald-700" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">Vorlagen</p>
            <p className="text-xs text-slate-500">
              Eine Vorlage ist Default und wird beim Anlegen neuer Angebote
              vorausgewaehlt.
            </p>
          </div>
        </div>

        <PaymentTermsManager
          initialTemplates={initialTemplates}
          createNonce={createNonce}
        />
      </div>
    </>
  );
}
