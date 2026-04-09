"use client";

import { useState } from "react";
import { DealHeader } from "./deal-header";
import { DealTimeline } from "./deal-timeline";
import { DealTasks } from "./deal-tasks";
import { DealProposals } from "./deal-proposals";
import { DealDocuments } from "./deal-documents";
import { DealEdit } from "./deal-edit";
import { DealActions } from "./deal-actions";
import type { PipelineStage, Pipeline } from "@/app/(app)/pipeline/actions";
import type { Task } from "@/app/(app)/aufgaben/actions";
import type { Meeting } from "@/app/(app)/meetings/actions";

type TabId = "timeline" | "tasks" | "proposals" | "documents" | "edit";

const tabs: { id: TabId; label: string }[] = [
  { id: "timeline", label: "Timeline" },
  { id: "tasks", label: "Aufgaben" },
  { id: "proposals", label: "Angebote" },
  { id: "documents", label: "Dokumente" },
  { id: "edit", label: "Bearbeiten" },
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
}: DealWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<TabId>("timeline");

  return (
    <div className="space-y-6">
      <DealHeader deal={deal} stages={stages} />

      <DealActions
        deal={deal}
        stages={stages}
        contacts={contacts}
        companies={companies}
        dealsForSelect={dealsForSelect}
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-[#4454b8] text-[#4454b8]"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
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
        {activeTab === "edit" && (
          <DealEdit
            deal={deal}
            stages={stages}
            pipelines={pipelines}
            contacts={contacts}
            companies={companies}
            referrals={referrals}
          />
        )}
      </div>
    </div>
  );
}
