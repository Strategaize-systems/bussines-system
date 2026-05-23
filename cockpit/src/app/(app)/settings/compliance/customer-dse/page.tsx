import { AlertTriangle } from "lucide-react";
import { assertRole } from "@/lib/auth/assert-role";
import {
  getCustomerDse,
  updateCustomerDse,
  resetCustomerDseToDefault,
} from "./actions";
import { CustomerDseEditor } from "@/components/settings/CustomerDseEditor";

export const dynamic = "force-dynamic";

export default async function CustomerDseSettingsPage() {
  await assertRole(["admin"]);
  const current = await getCustomerDse();

  return (
    <main className="px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Datenschutzerklaerung fuer Kunden
        </h1>
        <p className="text-sm text-muted-foreground">
          Wird im Consent-Form und im Mail-Footer als oeffentlich zugaenglicher
          Link angezeigt. Bearbeite den Markdown-Text und speichere — die
          Live-Vorschau rechts zeigt das gerenderte Ergebnis.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">
              ENTWURF — noch nicht juristisch geprueft
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Die Default-Vorlage enthaelt Platzhalter (z.B.{" "}
              <code className="rounded bg-white/60 px-1 font-mono text-xs">
                {"{{tenant_name}}"}
              </code>
              ,{" "}
              <code className="rounded bg-white/60 px-1 font-mono text-xs">
                {"{{contact_email}}"}
              </code>
              ) und ist nicht juristisch geprueft. Vor Customer-Live: Platzhalter
              ersetzen und Text vom eigenen Anwalt pruefen lassen.
            </p>
          </div>
        </div>
      </div>

      <CustomerDseEditor
        initialBody={current?.content_md ?? ""}
        updatedAt={current?.updated_at ?? null}
        onSave={updateCustomerDse}
        onReset={resetCustomerDseToDefault}
      />
    </main>
  );
}
