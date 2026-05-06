import {
  getPipelineById,
  getPipelineBySlug,
  getPipelineStages,
  getDealsForPipeline,
  getReferralsForSelect,
  getPipelines,
} from "../actions";
import { getContactsForSelect } from "../../contacts/actions";
import { getCompaniesForSelect } from "../../companies/actions";
import { listCampaignsForPicker } from "../../settings/campaigns/actions";
import { PipelineView } from "../pipeline-view";
import { notFound } from "next/navigation";

export default async function DynamicPipelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ campaign?: string }>;
}) {
  const { slug } = await params;
  const { campaign: campaignParam } = await searchParams;
  const selectedCampaignId = campaignParam || null;

  // Try known slug first (multiplikatoren, unternehmer, leads), then by ID
  let pipeline = await getPipelineBySlug(slug).catch(() => null);
  if (!pipeline) pipeline = await getPipelineById(slug);
  if (!pipeline) notFound();

  const [pipelines, stages, deals, contacts, companies, referrals, campaigns] =
    await Promise.all([
      getPipelines(),
      getPipelineStages(pipeline.id),
      getDealsForPipeline(pipeline.id, { campaignId: selectedCampaignId }),
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
    />
  );
}
