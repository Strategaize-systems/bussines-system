import {
  getPipelineBySlug,
  getPipelineStages,
  getDealsForPipeline,
} from "../actions";
import { getCompaniesForSelect } from "../../companies/actions";
import { PipelineView } from "../pipeline-view";
import { createClient } from "@/lib/supabase/server";

async function getContactsForSelect() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("id, first_name, last_name")
    .order("last_name");

  if (error) throw new Error(error.message);
  return data;
}

export default async function EndkundenPipelinePage() {
  const pipeline = await getPipelineBySlug("endkunden");
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
