import {
  getPipelineById,
  getPipelineStages,
  getDealsForPipeline,
  getReferralsForSelect,
  getPipelines,
} from "../actions";
import { getContactsForSelect } from "../../contacts/actions";
import { getCompaniesForSelect } from "../../companies/actions";
import { PipelineView } from "../pipeline-view";
import { notFound } from "next/navigation";

export default async function DynamicPipelinePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Dynamic route handles pipeline IDs (UUIDs) for user-created pipelines
  const pipeline = await getPipelineById(slug);
  if (!pipeline) notFound();

  const [pipelines, stages, deals, contacts, companies, referrals] = await Promise.all([
    getPipelines(),
    getPipelineStages(pipeline.id),
    getDealsForPipeline(pipeline.id),
    getContactsForSelect(),
    getCompaniesForSelect(),
    getReferralsForSelect(),
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
    />
  );
}
