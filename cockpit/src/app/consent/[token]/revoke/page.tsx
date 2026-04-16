import { createAdminClient } from "@/lib/supabase/admin";
import { RevokeForm } from "./revoke-form";

export const dynamic = "force-dynamic";

type Params = { token: string };

export default async function RevokePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { token } = await params;

  const admin = createAdminClient();
  const { data: contact } = await admin
    .from("contacts")
    .select("id, first_name, last_name, consent_status")
    .eq("consent_token", token)
    .maybeSingle();

  if (!contact) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">Link nicht gefunden</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dieser Widerrufs-Link ist nicht (mehr) gueltig.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-xl font-semibold">Einwilligung widerrufen</h1>
      <p className="mt-3 text-sm">
        Hallo {contact.first_name} {contact.last_name},
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        wenn Sie die Einwilligung zur Verarbeitung Ihrer Kontaktdaten widerrufen
        moechten, bestaetigen Sie das bitte unten. Wir setzen Ihren Status
        danach auf &quot;widerrufen&quot; und nehmen keinen weiteren Kontakt auf.
      </p>
      <div className="mt-6">
        <RevokeForm token={token} />
      </div>
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
