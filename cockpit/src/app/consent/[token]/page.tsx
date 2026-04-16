import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ConsentForm } from "./consent-form";

export const dynamic = "force-dynamic";

type Params = { token: string };

export default async function ConsentPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { token } = await params;

  const admin = createAdminClient();
  const { data: contact } = await admin
    .from("contacts")
    .select(
      "id, first_name, last_name, email, consent_status, consent_token_expires_at"
    )
    .eq("consent_token", token)
    .maybeSingle();

  if (!contact) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">Link nicht gefunden</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dieser Einwilligungs-Link ist nicht (mehr) gueltig. Bitte bitten Sie
          den Absender um eine neue Anfrage.
        </p>
      </Shell>
    );
  }

  const expired =
    contact.consent_token_expires_at &&
    new Date(contact.consent_token_expires_at) < new Date();

  if (expired) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">Link abgelaufen</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dieser Einwilligungs-Link ist abgelaufen. Bitte bitten Sie den
          Absender um eine neue Anfrage.
        </p>
      </Shell>
    );
  }

  if (contact.consent_status === "granted") {
    redirect(`/consent/${token}/confirmed?outcome=already-granted`);
  }

  return (
    <Shell>
      <h1 className="text-xl font-semibold">
        Einwilligung zur Verarbeitung Ihrer Kontaktdaten
      </h1>
      <p className="mt-3 text-sm">
        Hallo {contact.first_name} {contact.last_name},
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        wir speichern Ihre Kontaktdaten in unserem Business-System, um Sie im
        Rahmen unserer Zusammenarbeit zu kontaktieren (Meetings, Nachfassen,
        Terminabstimmung). Damit das DSGVO-konform erfolgt, bitten wir um Ihre
        Einwilligung. Sie koennen die Einwilligung jederzeit widerrufen.
      </p>
      <div className="mt-6">
        <ConsentForm token={token} />
      </div>
      <p className="mt-8 text-xs text-muted-foreground">
        Verantwortlicher: Immo Bellaerts. Bei Fragen:{" "}
        <a href="mailto:immo@bellaerts.de" className="underline">
          immo@bellaerts.de
        </a>
        .
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-16">
      <div className="mx-auto max-w-xl rounded-lg bg-background p-8 shadow-sm">
        {children}
      </div>
    </main>
  );
}
