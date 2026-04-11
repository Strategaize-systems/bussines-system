import {
  getPipelineBySlug,
  getPipelineStages,
  getDealsForPipeline,
  getReferralsForSelect,
  getPipelines,
} from "../actions";
import { getContactsForSelect } from "../../contacts/actions";
import { getCompaniesForSelect } from "../../companies/actions";
import { PipelineView } from "../pipeline-view";

export default async function UnternehmerPipelinePage() {
  const pipeline = await getPipelineBySlug("unternehmer");
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
      currentSlug="unternehmer"
    />
  );
}
