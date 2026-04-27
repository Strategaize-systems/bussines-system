// =============================================================
// /emails/compose — Composing-Studio (Server-Page, SLC-533 MT-1)
// =============================================================
// Vollbild-Seite mit 3-Panel-Layout (Vorlagen / Erfassen / Live-Preview-Slot).
// Live-Preview-Render kommt in SLC-534 — dieser Slice rendert nur das Skelett.
// Send-Action ebenfalls SLC-534.
//
// Server-Loader:
// - Branding (fuer SLC-534 Preview)
// - Templates (filter='all' — Filter-Tabs entscheiden client-seitig)
// - Deal-Kontext (Deal+Contact+Company+Sprache) wenn ?dealId=X gesetzt

import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { getBranding } from "@/app/(app)/settings/branding/actions";
import { getEmailTemplates } from "@/app/(app)/settings/template-actions";
import { ComposeStudio } from "./compose-studio";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "E-Mail erstellen",
};

export type DealContext = {
  dealId: string;
  dealTitle: string | null;
  stage: string | null;
  contactId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  vorname: string | null;
  nachname: string | null;
  position: string | null;
  firma: string | null;
  contactLanguage: string | null;
};

async function loadDealContext(
  dealId: string | undefined,
): Promise<DealContext | null> {
  if (!dealId) return null;

  const supabase = await createClient();
  const { data: deal, error } = await supabase
    .from("deals")
    .select(
      `
      id,
      title,
      contact_id,
      company_id,
      stage:pipeline_stages(name),
      contact:contacts(id, first_name, last_name, email, position, language),
      company:companies(id, name)
    `,
    )
    .eq("id", dealId)
    .maybeSingle();

  if (error || !deal) return null;

  const contact = (deal.contact as unknown as {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    position: string | null;
    language: string | null;
  } | null) ?? null;

  const company = (deal.company as unknown as { name: string | null } | null) ?? null;
  const stage = (deal.stage as unknown as { name: string | null } | null) ?? null;

  return {
    dealId: deal.id as string,
    dealTitle: (deal.title as string | null) ?? null,
    stage: stage?.name ?? null,
    contactId: contact?.id ?? null,
    contactName: contact
      ? [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim() ||
        null
      : null,
    contactEmail: contact?.email ?? null,
    vorname: contact?.first_name ?? null,
    nachname: contact?.last_name ?? null,
    position: contact?.position ?? null,
    firma: company?.name ?? null,
    contactLanguage: contact?.language ?? null,
  };
}

type ComposePageProps = {
  searchParams: Promise<{
    dealId?: string;
    contactId?: string;
    companyId?: string;
    templateId?: string;
  }>;
};

export default async function ComposePage({ searchParams }: ComposePageProps) {
  const params = await searchParams;

  const [branding, templates, dealContext] = await Promise.all([
    getBranding().catch(() => null),
    getEmailTemplates({ filter: "all" }),
    loadDealContext(params.dealId),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="E-Mail erstellen"
        subtitle={
          dealContext
            ? `Im Kontext von ${dealContext.dealTitle ?? "Deal"}`
            : "Vorlagen + KI-Vorschlag fuer Empfaenger und Betreff"
        }
      />
      <ComposeStudio
        branding={branding}
        templates={templates}
        dealContext={dealContext}
        initialContactId={params.contactId ?? null}
        initialCompanyId={params.companyId ?? null}
        initialTemplateId={params.templateId ?? null}
        senderFromAddress={
          process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || null
        }
      />
    </div>
  );
}
