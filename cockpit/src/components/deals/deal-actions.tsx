"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { moveDealToStage } from "@/app/(app)/pipeline/actions";
import { createProposal } from "@/app/(app)/proposals/actions";
import { TaskSheet } from "@/app/(app)/aufgaben/task-sheet";
import { MeetingSheet } from "@/components/meetings/meeting-sheet";
import { ActivityForm } from "@/components/activities/activity-form";
import { Button } from "@/components/ui/button";
import { ListTodo, Mail, Calendar, ChevronDown, Sparkles, Loader2, FileText } from "lucide-react";
import type { PipelineStage } from "@/app/(app)/pipeline/actions";
import { getContextPrefill } from "@/lib/context-prefill";
import { StartMeetingButton } from "@/components/meetings/start-meeting-button";
import { EnrollButton } from "@/components/cadences/enroll-button";
import { CallButton } from "@/components/calls/call-button";

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
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState<string | null>(null);
  const [isCreatingProposal, setIsCreatingProposal] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
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
    <div className="bg-white rounded-xl border-2 border-slate-200 shadow-lg p-4">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Stage Change */}
        <div className="relative">
          <select
            value={deal.stage_id ?? ""}
            onChange={handleStageChange}
            disabled={isPending}
            className="h-10 rounded-lg border-2 border-slate-200 bg-white pl-3 pr-8 text-sm font-semibold text-slate-700 appearance-none cursor-pointer hover:border-slate-300 focus:outline-none focus:border-[#4454b8] focus:ring-2 focus:ring-[#4454b8]/20 transition-all disabled:opacity-50"
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>

        <div className="h-8 w-px bg-slate-200" />

        {/* + Task */}
        <TaskSheet
          contacts={contacts}
          companies={companies}
          deals={dealsForSelect}
          defaultDealId={deal.id}
          defaultTitle={prefill.suggestedTaskTitle}
          trigger={
            <button className="flex items-center gap-2.5 h-10 px-4 rounded-lg border-2 border-slate-200 bg-white text-sm font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md transition-all cursor-pointer">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-sm">
                <ListTodo className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
              </span>
              Task
            </button>
          }
        />

        {/* + Email — SLC-534: Composing-Studio statt Sheet */}
        <Link
          href={(() => {
            const params = new URLSearchParams({ dealId: deal.id });
            if (deal.contact_id) params.set("contactId", deal.contact_id);
            if (deal.company_id) params.set("companyId", deal.company_id);
            return `/emails/compose?${params.toString()}`;
          })()}
          className="flex items-center gap-2.5 h-10 px-4 rounded-lg border-2 border-slate-200 bg-white text-sm font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md transition-all cursor-pointer"
        >
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-sm">
            <Mail className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
          </span>
          E-Mail
        </Link>

        {/* + Meeting (planen) */}
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
            <button className="flex items-center gap-2.5 h-10 px-4 rounded-lg border-2 border-slate-200 bg-white text-sm font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md transition-all cursor-pointer">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-violet-400 flex items-center justify-center shadow-sm">
                <Calendar className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
              </span>
              Meeting
            </button>
          }
        />

        {/* Meeting starten (Jitsi) */}
        <StartMeetingButton
          dealId={deal.id}
          dealTitle={deal.title}
          contacts={contacts}
        />

        {/* Anrufen (SLC-513) — nur wenn Kontakt Telefonnummer hat */}
        {deal.contacts?.phone && (
          <CallButton
            phoneNumber={deal.contacts.phone}
            contactName={
              deal.contacts
                ? `${deal.contacts.first_name ?? ""} ${deal.contacts.last_name ?? ""}`.trim() || null
                : null
            }
            dealId={deal.id}
            contactId={deal.contact_id ?? undefined}
          />
        )}

        {/* + Activity/Note */}
        <ActivityForm
          dealId={deal.id}
          contactId={deal.contact_id ?? undefined}
          companyId={deal.company_id ?? undefined}
        />

        {/* + Angebot (V5.5 SLC-552) */}
        <button
          type="button"
          disabled={isCreatingProposal}
          onClick={async () => {
            setProposalError(null);
            setIsCreatingProposal(true);
            try {
              const res = await createProposal({
                deal_id: deal.id,
                contact_id: deal.contact_id ?? null,
                company_id: deal.company_id ?? null,
              });
              if (res.ok) {
                router.push(`/proposals/${res.proposalId}/edit`);
              } else {
                setProposalError(res.error);
                setTimeout(() => setProposalError(null), 4000);
              }
            } catch (e) {
              setProposalError(e instanceof Error ? e.message : "Fehler");
              setTimeout(() => setProposalError(null), 4000);
            } finally {
              setIsCreatingProposal(false);
            }
          }}
          className="relative flex items-center gap-2.5 h-10 px-4 rounded-lg border-2 border-slate-200 bg-white text-sm font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait"
        >
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center shadow-sm">
            {isCreatingProposal ? (
              <Loader2 className="h-3.5 w-3.5 text-white animate-spin" strokeWidth={2.5} />
            ) : (
              <FileText className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
            )}
          </span>
          Angebot
          {proposalError && (
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white shadow-lg">
              {proposalError}
            </span>
          )}
        </button>

        {/* Cadence einbuchen (SLC-505) */}
        <EnrollButton dealId={deal.id} />

        <div className="h-8 w-px bg-slate-200" />

        {/* Signale extrahieren (SLC-436, MT-2) */}
        <button
          onClick={async () => {
            setIsExtracting(true);
            setExtractResult(null);
            try {
              const res = await fetch("/api/signals/extract", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deal_id: deal.id }),
              });
              const data = await res.json();
              if (data.success) {
                setExtractResult(
                  data.signalCount > 0
                    ? `${data.signalCount} Signale erkannt`
                    : "Keine neuen Signale"
                );
                router.refresh();
              } else {
                setExtractResult(data.error ?? "Fehler bei Extraktion");
              }
            } catch {
              setExtractResult("Netzwerkfehler");
            } finally {
              setIsExtracting(false);
              setTimeout(() => setExtractResult(null), 4000);
            }
          }}
          disabled={isExtracting}
          className="relative flex items-center gap-2.5 h-10 px-4 rounded-lg border-2 border-slate-200 bg-white text-sm font-bold text-slate-700 hover:border-purple-300 hover:bg-purple-50 hover:shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait"
        >
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-500 flex items-center justify-center shadow-sm">
            {isExtracting ? (
              <Loader2 className="h-3.5 w-3.5 text-white animate-spin" strokeWidth={2.5} />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
            )}
          </span>
          {isExtracting ? "Analysiere..." : "Signale extrahieren"}
          {extractResult && (
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white shadow-lg">
              {extractResult}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
