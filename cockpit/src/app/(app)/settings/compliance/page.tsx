import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getAllComplianceTemplates,
  resetComplianceTemplate,
  updateComplianceTemplate,
} from "./actions";
import { ComplianceTemplateBlock } from "@/components/settings/ComplianceTemplateBlock";

export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  const supabase = await createClient();
  const [{ data: auth }, templates] = await Promise.all([
    supabase.auth.getUser(),
    getAllComplianceTemplates(),
  ]);

  let userName = "";
  if (auth.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", auth.user.id)
      .maybeSingle();
    userName = profile?.display_name ?? "";
  }

  // userVars enthaelt nur die User-seitigen Tokens. kontakt_*-Tokens bleiben
  // bewusst leer, damit sie als Platzhalter sichtbar im Copy-Output bleiben.
  const userVars: Record<string, string> = {
    user_name: userName,
    user_email: auth.user?.email ?? "",
  };

  return (
    <main className="px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Einwilligungstexte</h1>
        <p className="text-sm text-muted-foreground">
          Standardvorlagen fuer DSGVO-konforme Einwilligungstexte. Bearbeiten,
          kopieren und in externe Workflows (Outlook, Cal.com, E-Mail-Signatur)
          einsetzen.
        </p>
      </div>

      {/* Anwalts-Hinweis */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">
              Pragmatische Standardvorlagen — keine Rechtsberatung
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Diese Texte sind sorgfaeltig formulierte Standardvorlagen fuer den
              Einstieg. Sie ersetzen keine anwaltliche Pruefung. Vor produktivem
              Einsatz mit echten Geschaeftspartnern bitte mit Datenschutzberatung
              oder Anwalt abstimmen — insbesondere bezueglich Speicherdauern,
              Verantwortlichen-Angaben und Widerspruchsmoeglichkeiten.
            </p>
          </div>
        </div>
      </div>

      {/* 3 Template-Bloecke */}
      <div className="space-y-4">
        {templates.map((tpl) => (
          <ComplianceTemplateBlock
            key={tpl.template_key}
            templateKey={tpl.template_key}
            initialBody={tpl.body_markdown}
            defaultBody={tpl.default_body_markdown}
            onSave={updateComplianceTemplate}
            onReset={resetComplianceTemplate}
            userVars={userVars}
          />
        ))}
      </div>
    </main>
  );
}
