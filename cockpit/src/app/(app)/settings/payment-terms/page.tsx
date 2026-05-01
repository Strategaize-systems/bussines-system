import { Receipt } from "lucide-react";
import { listPaymentTermsTemplates } from "./actions";
import { PaymentTermsManager } from "./payment-terms-manager";

export const dynamic = "force-dynamic";

export default async function PaymentTermsPage() {
  const templates = await listPaymentTermsTemplates();

  return (
    <main className="px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Zahlungsbedingungen
        </h1>
        <p className="text-sm text-muted-foreground">
          Vorlagen fuer typische Zahlungsbedingungen, die im Angebot-Editor per
          Dropdown auswaehlbar sind.
        </p>
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

        <PaymentTermsManager initialTemplates={templates} />
      </div>
    </main>
  );
}
