import {
  getPipelineBySlug,
  getPipelineStages,
  getDealsForPipeline,
  getReferralsForSelect,
} from "../actions";
import { getContactsForSelect } from "../../contacts/actions";
import { getCompaniesForSelect } from "../../companies/actions";
import { PipelineView } from "../pipeline-view";

export default async function LeadsPipelinePage() {
  const pipeline = await getPipelineBySlug("leads");
  const [stages, deals, contacts, companies, referrals] = await Promise.all([
    getPipelineStages(pipeline.id),
    getDealsForPipeline(pipeline.id),
    getContactsForSelect(),
    getCompaniesForSelect(),
    getReferralsForSelect(),
  ]);

  return (
    <PipelineView
      pipeline={pipeline}
      stages={stages}
      deals={deals}
      contacts={contacts}
      companies={companies}
      referrals={referrals}
    />
  );
}
