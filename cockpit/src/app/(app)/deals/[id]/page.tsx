import { getDealWithRelations, getPipelineStages, getPipelines, getDealsForSelect, getReferralsForSelect } from "@/app/(app)/pipeline/actions";
import { getMeetingsForDeal } from "@/app/(app)/meetings/actions";
import { getTasks } from "@/app/(app)/aufgaben/actions";
import { getDocuments } from "@/lib/actions/document-actions";
import { getContactsForSelect } from "@/app/(app)/contacts/actions";
import { getCompaniesForSelect } from "@/app/(app)/companies/actions";
import { DealWorkspace } from "@/components/deals/deal-workspace";
import { notFound } from "next/navigation";

export default async function DealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let relations;
  try {
    relations = await getDealWithRelations(id);
  } catch {
    notFound();
  }

  const deal = relations.deal;

  const [stages, pipelines, tasks, meetings, documents, contacts, companies, dealsForSelect, referrals] = await Promise.all([
    getPipelineStages(deal.pipeline_id),
    getPipelines(),
    getTasks({ dealId: id }),
    getMeetingsForDeal(id),
    getDocuments({ dealId: id }),
    getContactsForSelect(),
    getCompaniesForSelect(),
    getDealsForSelect(),
    getReferralsForSelect(),
  ]);

  return (
    <DealWorkspace
      deal={deal}
      activities={relations.activities}
      proposals={relations.proposals}
      signals={relations.signals}
      emails={relations.emails}
      tasks={tasks}
      meetings={meetings}
      documents={documents}
      stages={stages}
      pipelines={pipelines}
      contacts={contacts}
      companies={companies}
      dealsForSelect={dealsForSelect}
      referrals={referrals}
    />
  );
}
