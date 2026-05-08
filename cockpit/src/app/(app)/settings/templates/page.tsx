import { TemplatesConfig } from "../templates-config";
import { getEmailTemplates } from "../template-actions";

export const dynamic = "force-dynamic";

export default async function TemplatesSettingsPage() {
  const templates = await getEmailTemplates();

  return (
    <main className="px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">E-Mail-Templates</h1>
        <p className="text-sm text-muted-foreground">
          Mehrsprachige Vorlagen fuer ausgehende E-Mails (DE / NL / EN).
        </p>
      </div>

      <TemplatesConfig templates={templates} />
    </main>
  );
}
