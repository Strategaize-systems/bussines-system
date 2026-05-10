"use client";

import { useState, useMemo } from "react";
import { DealHeader } from "./deal-header";
import { DealTimeline } from "./deal-timeline";
import { DealTasks } from "./deal-tasks";
import { DealProposals } from "./deal-proposals";
import { DealDocuments } from "./deal-documents";
import { DealEdit } from "./deal-edit";
import { DealActionBar } from "./deal-action-bar";
import { KnowledgeQueryPanel } from "@/components/knowledge/KnowledgeQueryPanel";
import { ProcessCheckPanel } from "./process-check-panel";
import { AIBriefingPanel } from "./ai-briefing-panel";
import { DealKIWorkspace } from "./deal-ki-workspace-wrapper";
import { EnrollmentBadge } from "@/components/cadences/enrollment-badge";
import { getProcessChecks } from "@/lib/process-check";
import {
  Clock,
  ListTodo,
  FileText,
  FolderOpen,
  BookOpen,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineStage, Pipeline } from "@/app/(app)/pipeline/actions";
import type { Task } from "@/app/(app)/aufgaben/actions";
import type { Meeting } from "@/app/(app)/meetings/actions";
import type { DealBriefingContext } from "@/lib/ai/types";
import type { DealProductWithName } from "@/app/actions/deal-products";
import type { Product } from "@/types/products";
import type { CadenceEnrollmentWithContext } from "@/types/cadence";
import type { TrackingSummary } from "@/types/email-tracking";
import type { Call } from "@/app/(app)/calls/actions";

type TabId = "timeline" | "tasks" | "proposals" | "documents" | "wissen" | "edit";

const tabs: { id: TabId; label: string; icon: typeof Clock }[] = [
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "tasks", label: "Aufgaben", icon: ListTodo },
  { id: "proposals", label: "Angebote", icon: FileText },
  { id: "documents", label: "Dokumente", icon: FolderOpen },
  { id: "wissen", label: "Wissen", icon: BookOpen },
  { id: "edit", label: "Bearbeiten", icon: Settings },
];

interface DealWorkspaceProps {
  userId: string;
  deal: any;
  activities: any[];
  proposals: any[];
  signals: any[];
  emails: any[];
  tasks: Task[];
  meetings: Meeting[];
  documents: any[];
  stages: PipelineStage[];
  pipelines: Pipeline[];
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  dealsForSelect: { id: string; title: string }[];
  referrals: { id: string; label: string }[];
  dealProducts: DealProductWithName[];
  activeProducts: Product[];
  enrollments?: CadenceEnrollmentWithContext[];
  trackingSummaries?: Record<string, TrackingSummary>;
  inboxEmails?: any[];
  calls?: Call[];
}

export function DealWorkspace({
  userId,
  deal,
  activities,
  proposals,
  signals,
  emails,
  tasks,
  meetings,
  documents,
  stages,
  pipelines,
  contacts,
  companies,
  dealsForSelect,
  referrals,
  dealProducts,
  activeProducts,
  enrollments,
  trackingSummaries = {},
  inboxEmails = [],
  calls = [],
}: DealWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<TabId>("timeline");

  const stageName = stages.find((s) => s.id === deal.stage_id)?.name ?? "";
  const stageProb = stages.find((s) => s.id === deal.stage_id)?.probability;

  const processChecks = useMemo(
    () => getProcessChecks(deal, stageName),
    [deal, stageName]
  );

  const briefingContext = useMemo<DealBriefingContext>(
    () => ({
      deal: {
        id: deal.id,
        name: deal.title,
        value: deal.value ?? undefined,
        stage: stageName || undefined,
        probability: stageProb ?? undefined,
        expectedCloseDate: deal.expected_close_date ?? undefined,
        notes: deal.next_action ?? undefined,
      },
      contacts: deal.contacts
        ? [
            {
              name: `${deal.contacts.first_name} ${deal.contacts.last_name}`,
              role: deal.contacts.position ?? undefined,
              company: deal.companies?.name ?? undefined,
            },
          ]
        : [],
      activities: activities.slice(0, 10).map((a: any) => ({
        type: a.type || "note",
        subject: a.title || a.type,
        date: new Date(a.created_at).toLocaleDateString("de-DE"),
        notes: a.summary || a.description || undefined,
      })),
      proposals: proposals.map((p: any) => ({
        title: p.title,
        status: p.status ?? undefined,
        date: new Date(p.created_at).toLocaleDateString("de-DE"),
      })),
    }),
    [deal, stageName, stageProb, activities, proposals]
  );

  return (
    <div className="space-y-6">
      <DealHeader
        deal={deal}
        stages={stages}
        activities={activities}
        pipelines={pipelines}
        contacts={contacts}
        companies={companies}
        referrals={referrals}
        dealProducts={dealProducts}
        activeProducts={activeProducts}
      />

      <DealActionBar
        deal={deal}
        contacts={contacts}
        companies={companies}
        dealsForSelect={dealsForSelect}
      />

      {/* Cadence Enrollment Badges (SLC-505) */}
      {enrollments && enrollments.length > 0 && (
        <EnrollmentBadge enrollments={enrollments} />
      )}

      {/* SLC-664/MT-5 Sub-Block 3 (AC8): 2/3 + 1/3 Layout. Mobile: vertikal staffeln. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LINKS (lg:2/3): KI-Workspace */}
        <div className="lg:col-span-2 space-y-6">
          <DealKIWorkspace userId={userId} dealId={deal.id} />
        </div>

        {/* RECHTS (lg:1/3): Tabs (Timeline / Tasks / Proposals / Documents / Wissen / Edit) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex gap-1 bg-white rounded-xl border-2 border-slate-200 shadow-lg p-1.5 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0",
                    isActive
                      ? "bg-gradient-to-r from-[#120774] to-[#4454b8] text-white shadow-lg"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div>
            {activeTab === "timeline" && (
              <DealTimeline
                activities={activities}
                emails={emails}
                meetings={meetings}
                signals={signals}
                trackingSummaries={trackingSummaries}
                inboxEmails={inboxEmails}
                calls={calls}
              />
            )}
            {activeTab === "tasks" && (
              <DealTasks tasks={tasks} dealId={deal.id} />
            )}
            {activeTab === "proposals" && (
              <DealProposals proposals={proposals} />
            )}
            {activeTab === "documents" && (
              <DealDocuments documents={documents} dealId={deal.id} />
            )}
            {activeTab === "wissen" && (
              <KnowledgeQueryPanel dealId={deal.id} />
            )}
            {activeTab === "edit" && (
              <DealEdit
                deal={deal}
                stages={stages}
                pipelines={pipelines}
                contacts={contacts}
                companies={companies}
                referrals={referrals}
                dealProducts={dealProducts}
                activeProducts={activeProducts}
              />
            )}
          </div>

          {/* Process-Check + Legacy AI-Briefing voruebergehend hier behalten,
              werden in MT-6 (Sub-Block 4) entfernt. */}
          <ProcessCheckPanel checks={processChecks} />
          <AIBriefingPanel context={briefingContext} />
        </div>
      </div>
    </div>
  );
}
