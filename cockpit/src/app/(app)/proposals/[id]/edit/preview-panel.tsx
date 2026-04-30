"use client";

import { useEffect, useState } from "react";
import { Info, FileText, GitBranch } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProposalHtmlPreview } from "@/components/proposal/proposal-html-preview";
import type {
  Proposal,
  ProposalItem,
  ProposalEditPayload,
} from "@/app/(app)/proposals/actions";
import { useDebouncedCallback } from "@/lib/utils/use-debounce";

type ProposalPreviewPanelProps = {
  proposal: Proposal;
  items: ProposalItem[];
  branding: ProposalEditPayload["branding"];
  company: ProposalEditPayload["company"];
  contact: ProposalEditPayload["contact"];
};

export function ProposalPreviewPanel({
  proposal,
  items,
  branding,
  company,
  contact,
}: ProposalPreviewPanelProps) {
  // Debounce-Pattern: live-state ist sofort aktuell, snapshot-state lagged 250ms
  // hinterher und ist die tatsaechliche Render-Quelle. Das vermeidet schweren
  // Re-Render bei jedem Tastendruck waehrend Auto-Save.
  const [snapshot, setSnapshot] = useState({ proposal, items });

  const debouncedSync = useDebouncedCallback(
    (next: { proposal: Proposal; items: ProposalItem[] }) => {
      setSnapshot(next);
    },
    250,
  );

  useEffect(() => {
    debouncedSync({ proposal, items });
  }, [proposal, items, debouncedSync]);

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b-2 border-slate-200 bg-slate-50">
        <div className="text-sm font-bold text-slate-900">Vorschau</div>
        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5">
          <Info className="h-3 w-3" />
          HTML-Annaeherung — finales PDF kann minimal abweichen
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-100 p-4">
        <ProposalHtmlPreview
          proposal={snapshot.proposal}
          items={snapshot.items}
          branding={branding}
          company={company}
          contact={contact}
        />
      </div>

      <div className="px-4 py-3 border-t-2 border-slate-200 bg-slate-50 flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled
          title="Verfuegbar in V5.5 SLC-553"
          className="gap-1.5"
        >
          <FileText className="h-4 w-4" />
          PDF generieren
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled
          title="Verfuegbar in V5.5 SLC-554"
          className="gap-1.5"
        >
          <GitBranch className="h-4 w-4" />
          Neue Version
        </Button>
      </div>
    </div>
  );
}
