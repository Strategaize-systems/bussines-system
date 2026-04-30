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
    <div className="flex flex-col h-full bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
      <div className="px-5 py-4 border-b-2 border-slate-200">
        <h3 className="text-base font-bold text-slate-900">Vorschau</h3>
        <p className="text-[11px] font-medium text-slate-500 mt-0.5 flex items-center gap-1.5">
          <Info className="h-3 w-3" />
          HTML-Annaeherung — finales PDF kann minimal abweichen
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-100 to-slate-200 p-5">
        <ProposalHtmlPreview
          proposal={snapshot.proposal}
          items={snapshot.items}
          branding={branding}
          company={company}
          contact={contact}
        />
      </div>

      <div className="px-5 py-4 border-t-2 border-slate-200 flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled
          title="Verfuegbar in V5.5 SLC-553"
          className="gap-1.5 font-bold"
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
          className="gap-1.5 font-bold"
        >
          <GitBranch className="h-4 w-4" />
          Neue Version
        </Button>
      </div>
    </div>
  );
}
