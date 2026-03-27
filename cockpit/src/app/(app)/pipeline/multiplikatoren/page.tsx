import {
  getPipelineBySlug,
  getPipelineStages,
  getDealsForPipeline,
} from "../actions";
import { getContactsForSelect } from "../../contacts/actions";
import { getCompaniesForSelect } from "../../companies/actions";
import { PipelineView } from "../pipeline-view";

export default async function MultiplikatorenPipelinePage() {
  const pipeline = await getPipelineBySlug("multiplikatoren");
  const [stages, deals, contacts, companies] = await Promise.all([
    getPipelineStages(pipeline.id),
    getDealsForPipeline(pipeline.id),
    getContactsForSelect(),
    getCompaniesForSelect(),
  ]);

  return (
    <PipelineView
      pipeline={pipeline}
      stages={stages}
      deals={deals}
      contacts={contacts}
      companies={companies}
    />
  );
}
