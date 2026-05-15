// V7.1 SLC-712a — Drilldown-Pipeline Default-Variante via PipelineView-Reuse.
//
// Ersetzt die V7-SLC-706 reduzierte Tabelle. Laedt die erste Pipeline aus
// sortierter Liste und rendert die volle <PipelineView readOnly viewAsUserId>.
// Pipeline-Switcher-Tabs in der View linken auf /team/[user_id]/pipeline/[slug].
//
// Owner-Scope: getDealsForPipeline mit ownerUserId-Filter (RLS erlaubt
// Teamlead Read auf Team-Member-Daten via V7 MIG-033/034, Filter ist
// semantisch fuer den Target-Member-Scope).
//
// Architektur-Hinweis: ReadOnlyContext wird im Drilldown-Layout
// (team/[user_id]/layout.tsx) via runWithReadOnlyContext + ReadOnlyContextProvider
// um die Children gewrappt. assertNotReadOnlyContext() in Server Actions
// blockt jeden Mutate-Versuch als Defense-in-Depth (DEC-189).

import { notFound } from "next/navigation";
import {
  getPipelines,
  getPipelineStages,
  getDealsForPipeline,
  getReferralsForSelect,
} from "@/app/(app)/pipeline/actions";
import { getContactsForSelect } from "@/app/(app)/contacts/actions";
import { getCompaniesForSelect } from "@/app/(app)/companies/actions";
import { listCampaignsForPicker } from "@/app/(app)/settings/campaigns/actions";
import { PipelineView } from "@/app/(app)/pipeline/pipeline-view";

interface PageProps {
  params: Promise<{ user_id: string }>;
  searchParams: Promise<{ campaign?: string }>;
}

// Pipeline-Slug-Aufloesung analog zu /pipeline/[slug]/page.tsx
// (KNOWN_SLUGS in pipeline-view.tsx). Built-in-Pipelines haben einen
// festen Slug, Custom-Pipelines die UUID.
const KNOWN_SLUGS: Record<string, string> = {
  "Multiplikatoren": "multiplikatoren",
  "Unternehmer-Chancen": "unternehmer",
  "Lead-Management": "leads",
};

function slugFor(pipelineName: string, pipelineId: string): string {
  return KNOWN_SLUGS[pipelineName] ?? pipelineId;
}

export default async function DrilldownPipelineDefaultPage({
  params,
  searchParams,
}: PageProps) {
  const { user_id: targetUserId } = await params;
  const { campaign: campaignParam } = await searchParams;
  const selectedCampaignId = campaignParam || null;

  const pipelines = await getPipelines();
  if (pipelines.length === 0) notFound();
  const defaultPipeline = pipelines[0];
  const defaultSlug = slugFor(defaultPipeline.name, defaultPipeline.id);

  const [stages, deals, contacts, companies, referrals, campaigns] =
    await Promise.all([
      getPipelineStages(defaultPipeline.id),
      getDealsForPipeline(defaultPipeline.id, {
        campaignId: selectedCampaignId,
        ownerUserId: targetUserId,
      }),
      getContactsForSelect(),
      getCompaniesForSelect(),
      getReferralsForSelect(),
      listCampaignsForPicker(["draft", "active", "finished"]),
    ]);

  return (
    <PipelineView
      pipeline={defaultPipeline}
      pipelines={pipelines}
      stages={stages}
      deals={deals}
      contacts={contacts}
      companies={companies}
      referrals={referrals}
      currentSlug={defaultSlug}
      campaigns={campaigns}
      selectedCampaignId={selectedCampaignId}
      readOnly
      viewAsUserId={targetUserId}
    />
  );
}
