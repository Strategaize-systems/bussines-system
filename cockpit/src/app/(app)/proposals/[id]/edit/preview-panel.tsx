"use client";

import { useEffect, useState, useTransition } from "react";
import { Info, FileText, GitBranch, Loader2, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProposalHtmlPreview } from "@/components/proposal/proposal-html-preview";
import {
  generateProposalPdf,
  type Proposal,
  type ProposalItem,
  type ProposalEditPayload,
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

  const [isPending, startTransition] = useTransition();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  function handleGeneratePdf() {
    setPdfError(null);
    startTransition(async () => {
      const res = await generateProposalPdf(proposal.id);
      if (res.ok) {
        setPdfUrl(res.pdfUrl);
        setPdfFilename(res.filename);
      } else {
        setPdfError(res.error);
      }
    });
  }

  function handleClosePdf() {
    setPdfUrl(null);
    setPdfFilename(null);
  }

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

      <div className="px-5 py-4 border-t-2 border-slate-200 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={handleGeneratePdf}
            className="gap-1.5 font-bold"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {isPending ? "Generiere PDF..." : "PDF generieren"}
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
        {pdfError && (
          <div
            role="alert"
            className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700"
          >
            {pdfError}
          </div>
        )}
      </div>

      <Dialog
        open={pdfUrl !== null}
        onOpenChange={(open) => {
          if (!open) handleClosePdf();
        }}
      >
        <DialogContent className="max-w-5xl w-[95vw] sm:max-w-5xl h-[90vh] flex flex-col p-4">
          <DialogHeader className="flex flex-row items-center justify-between gap-2">
            <DialogTitle className="text-base font-bold">
              PDF-Vorschau
              {pdfFilename && (
                <span className="ml-2 text-xs font-normal text-slate-500">
                  {pdfFilename}
                </span>
              )}
            </DialogTitle>
            {pdfUrl && (
              <a
                href={pdfUrl}
                download={pdfFilename ?? undefined}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 mr-8"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            )}
          </DialogHeader>
          {pdfUrl && (
            <iframe
              src={pdfUrl}
              title="Angebot PDF"
              className="flex-1 w-full rounded-md border border-slate-200 bg-white"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
