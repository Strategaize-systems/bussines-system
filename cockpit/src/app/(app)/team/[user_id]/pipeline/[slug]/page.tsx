// V7.1 SLC-712a — Drilldown-Pipeline Slug-Variante via PipelineView-Reuse.
//
// Analog zu /pipeline/[slug]/page.tsx, aber im Drilldown-Kontext mit
// readOnly + viewAsUserId. Pipeline-Switcher-Tabs in PipelineView linken
// auf /team/[user_id]/pipeline/[slug] (siehe pipelinePathBase-Logik in
// pipeline-view.tsx).
//
// Owner-Scope: getDealsForPipeline mit ownerUserId-Filter.

import { notFound } from "next/navigation";
import {
  getPipelineById,
  getPipelineBySlug,
  getPipelineStages,
  getDealsForPipeline,
  getReferralsForSelect,
  getPipelines,
} from "@/app/(app)/pipeline/actions";
import { getContactsForSelect } from "@/app/(app)/contacts/actions";
import { getCompaniesForSelect } from "@/app/(app)/companies/actions";
import { listCampaignsForPicker } from "@/app/(app)/settings/campaigns/actions";
import { PipelineView } from "@/app/(app)/pipeline/pipeline-view";

interface PageProps {
  params: Promise<{ user_id: string; slug: string }>;
  searchParams: Promise<{ campaign?: string }>;
}

export default async function DrilldownPipelineBySlugPage({
  params,
  searchParams,
}: PageProps) {
  const { user_id: targetUserId, slug } = await params;
  const { campaign: campaignParam } = await searchParams;
  const selectedCampaignId = campaignParam || null;

  // Bekannte Slugs zuerst, dann als ID interpretieren — gleiches Pattern wie
  // /pipeline/[slug]/page.tsx.
  let pipeline = await getPipelineBySlug(slug).catch(() => null);
  if (!pipeline) pipeline = await getPipelineById(slug);
  if (!pipeline) notFound();

  const [pipelines, stages, deals, contacts, companies, referrals, campaigns] =
    await Promise.all([
      getPipelines(),
      getPipelineStages(pipeline.id),
      getDealsForPipeline(pipeline.id, {
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
      pipeline={pipeline}
      pipelines={pipelines}
      stages={stages}
      deals={deals}
      contacts={contacts}
      companies={companies}
      referrals={referrals}
      currentSlug={slug}
      campaigns={campaigns}
      selectedCampaignId={selectedCampaignId}
      readOnly
      viewAsUserId={targetUserId}
    />
  );
}
