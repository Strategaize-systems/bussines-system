"use client";

import { useState, useMemo } from "react";
import { DealHeader } from "./deal-header";
import { DealTimeline } from "./deal-timeline";
import { DealTasks } from "./deal-tasks";
import { DealProposals } from "./deal-proposals";
import { DealDocuments } from "./deal-documents";
import { DealEdit } from "./deal-edit";
import { DealActions } from "./deal-actions";
import { KnowledgeQueryPanel } from "@/components/knowledge/KnowledgeQueryPanel";
import { ProcessCheckPanel } from "./process-check-panel";
import { AIBriefingPanel } from "./ai-briefing-panel";
import { getProcessChecks } from "@/lib/process-check";
import {
  Clock,
  ListTodo,
  FileText,
  FolderOpen,
  BookOpen,
  Settings,
} from "lucide-react";
import type { PipelineStage, Pipeline } from "@/app/(app)/pipeline/actions";
import type { Task } from "@/app/(app)/aufgaben/actions";
import type { Meeting } from "@/app/(app)/meetings/actions";
import type { DealBriefingContext } from "@/lib/ai/types";
import type { DealProductWithName } from "@/app/actions/deal-products";
import type { Product } from "@/types/products";

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
}

export function DealWorkspace({
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
      <DealHeader deal={deal} stages={stages} activities={activities} />

      <DealActions
        deal={deal}
        stages={stages}
        contacts={contacts}
        companies={companies}
        dealsForSelect={dealsForSelect}
      />

      {/* Two-column layout: Main content + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main: Tabs + Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex gap-1 bg-white rounded-xl border-2 border-slate-200 shadow-lg p-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-[#120774] to-[#4454b8] text-white shadow-lg"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
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
        </div>

        {/* Sidebar: Process Check + AI Briefing (Sticky) */}
        <div className="lg:sticky lg:top-32 space-y-6 self-start">
          <ProcessCheckPanel checks={processChecks} />
          <AIBriefingPanel context={briefingContext} />
        </div>
      </div>
    </div>
  );
}
