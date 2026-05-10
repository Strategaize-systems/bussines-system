"use client";

import { useState } from "react";
import { DealHeader } from "./deal-header";
import { DealTimeline } from "./deal-timeline";
import { DealTasks } from "./deal-tasks";
import { DealProposals } from "./deal-proposals";
import { DealDocuments } from "./deal-documents";
import { DealActionBar } from "./deal-action-bar";
import { DealKIWorkspace } from "./deal-ki-workspace-wrapper";
import { EnrollmentBadge } from "@/components/cadences/enrollment-badge";
import { Clock, ListTodo, FileText, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineStage, Pipeline } from "@/app/(app)/pipeline/actions";
import type { Task } from "@/app/(app)/aufgaben/actions";
import type { Meeting } from "@/app/(app)/meetings/actions";
import type { DealProductWithName } from "@/app/actions/deal-products";
import type { Product } from "@/types/products";
import type { CadenceEnrollmentWithContext } from "@/types/cadence";
import type { TrackingSummary } from "@/types/email-tracking";
import type { Call } from "@/app/(app)/calls/actions";

type TabId = "timeline" | "tasks" | "proposals" | "documents";

const tabs: { id: TabId; label: string; icon: typeof Clock }[] = [
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "tasks", label: "Aufgaben", icon: ListTodo },
  { id: "proposals", label: "Angebote", icon: FileText },
  { id: "documents", label: "Dokumente", icon: FolderOpen },
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

      {enrollments && enrollments.length > 0 && (
        <EnrollmentBadge enrollments={enrollments} />
      )}

      {/* SLC-664/MT-5 (AC8): 2/3+1/3 Layout. Mobile: vertikal staffeln. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <DealKIWorkspace userId={userId} dealId={deal.id} />
        </div>

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
          </div>
        </div>
      </div>
    </div>
  );
}
