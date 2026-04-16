export const dynamic = "force-dynamic";

type Search = { outcome?: string };

export default async function ConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { outcome } = await searchParams;

  const title = outcomeTitle(outcome);
  const body = outcomeBody(outcome);

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-16">
      <div className="mx-auto max-w-xl rounded-lg bg-background p-8 shadow-sm">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{body}</p>
        <p className="mt-6 text-xs text-muted-foreground">
          Sie koennen dieses Fenster jetzt schliessen.
        </p>
      </div>
    </main>
  );
}

function outcomeTitle(o: string | undefined): string {
  switch (o) {
    case "grant":
      return "Einwilligung erteilt";
    case "decline":
      return "Einwilligung abgelehnt";
    case "revoke":
      return "Einwilligung widerrufen";
    case "already-granted":
      return "Einwilligung bereits erteilt";
    default:
      return "Vorgang abgeschlossen";
  }
}

function outcomeBody(o: string | undefined): string {
  switch (o) {
    case "grant":
      return "Vielen Dank. Wir haben Ihre Einwilligung dokumentiert. Sie koennen sie jederzeit ueber den Widerruf-Link in unseren Mails zurueckziehen.";
    case "decline":
      return "Wir haben Ihre Entscheidung dokumentiert und werden Sie nicht weiter kontaktieren.";
    case "revoke":
      return "Wir haben Ihren Widerruf dokumentiert. Wir werden Sie nicht mehr kontaktieren.";
    case "already-granted":
      return "Wir haben Ihre Einwilligung bereits dokumentiert. Es ist keine weitere Aktion noetig.";
    default:
      return "Der Vorgang ist abgeschlossen.";
  }
}
