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
import { PipelineView } from "../pipeline-view";
import { notFound } from "next/navigation";

export default async function DynamicPipelinePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Try known slug first (multiplikatoren, unternehmer, leads), then by ID
  let pipeline = await getPipelineBySlug(slug).catch(() => null);
  if (!pipeline) pipeline = await getPipelineById(slug);
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
