"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveDealToStage } from "@/app/(app)/pipeline/actions";
import { TaskSheet } from "@/app/(app)/aufgaben/task-sheet";
import { MeetingSheet } from "@/components/meetings/meeting-sheet";
import { EmailSheet } from "@/app/(app)/emails/email-sheet";
import { ActivityForm } from "@/components/activities/activity-form";
import { Button } from "@/components/ui/button";
import { ListTodo, Mail, Calendar, ChevronDown } from "lucide-react";
import type { PipelineStage } from "@/app/(app)/pipeline/actions";
import { getContextPrefill } from "@/lib/context-prefill";

interface DealActionsProps {
  deal: any;
  stages: PipelineStage[];
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  dealsForSelect: { id: string; title: string }[];
}

export function DealActions({
  deal,
  stages,
  contacts,
  companies,
  dealsForSelect,
}: DealActionsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const prefill = getContextPrefill({
    deal: {
      title: deal.title,
      next_action: deal.next_action,
      contact_id: deal.contact_id,
      company_id: deal.company_id,
    },
    contact: deal.contacts ? {
      first_name: deal.contacts.first_name,
      last_name: deal.contacts.last_name,
      email: deal.contacts.email ?? null,
      priority: deal.contacts.priority ?? null,
    } : null,
    company: deal.companies ? { name: deal.companies.name } : null,
  });

  const handleStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStageId = e.target.value;
    const stageName = stages.find((s) => s.id === newStageId)?.name ?? "";
    startTransition(async () => {
      const result = await moveDealToStage(deal.id, newStageId, stageName);
      if (result.error) {
        alert(result.error);
        e.target.value = deal.stage_id ?? "";
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Stage Change */}
      <div className="relative">
        <select
          value={deal.stage_id ?? ""}
          onChange={handleStageChange}
          disabled={isPending}
          className="h-9 rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-sm font-medium text-slate-700 appearance-none cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#4454b8]/20 disabled:opacity-50"
        >
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
      </div>

      <div className="h-6 w-px bg-slate-200" />

      {/* + Task */}
      <TaskSheet
        contacts={contacts}
        companies={companies}
        deals={dealsForSelect}
        defaultDealId={deal.id}
        defaultTitle={prefill.suggestedTaskTitle}
        trigger={
          <Button variant="outline" size="sm" className="text-xs">
            <ListTodo className="mr-1.5 h-3.5 w-3.5" />
            Task
          </Button>
        }
      />

      {/* + Email */}
      <EmailSheet
        defaultTo={deal.contacts?.email ?? ""}
        defaultSubject={prefill.suggestedSubject}
        defaultFollowUpDate={prefill.suggestedFollowUpDate}
        contactId={deal.contact_id ?? undefined}
        companyId={deal.company_id ?? undefined}
        dealId={deal.id}
        trigger={
          <Button variant="outline" size="sm" className="text-xs">
            <Mail className="mr-1.5 h-3.5 w-3.5" />
            E-Mail
          </Button>
        }
      />

      {/* + Meeting */}
      <MeetingSheet
        contacts={contacts}
        companies={companies}
        deals={dealsForSelect}
        defaultDealId={deal.id}
        defaultContactId={deal.contact_id ?? undefined}
        defaultCompanyId={deal.company_id ?? undefined}
        defaultParticipants={prefill.suggestedParticipants}
        defaultAgenda={prefill.suggestedAgenda}
        trigger={
          <Button variant="outline" size="sm" className="text-xs">
            <Calendar className="mr-1.5 h-3.5 w-3.5" />
            Meeting
          </Button>
        }
      />

      {/* + Activity/Note */}
      <ActivityForm
        dealId={deal.id}
        contactId={deal.contact_id ?? undefined}
        companyId={deal.company_id ?? undefined}
      />
    </div>
  );
}
