"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Info, FileText, GitBranch, Loader2, Download, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProposalHtmlPreview } from "@/components/proposal/proposal-html-preview";
import {
  generateProposalPdf,
  createProposalVersion,
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
  const router = useRouter();
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

  const [isPdfPending, startPdfTransition] = useTransition();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // V5.5 SLC-554: Neue-Version-Confirm + Server-Action.
  const [versionConfirmOpen, setVersionConfirmOpen] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [isVersionPending, startVersionTransition] = useTransition();

  // Read-only-Modus: status != draft → Editor disabled, vorhandenes PDF wird
  // direkt im iframe statt "neu generieren" angezeigt. PDF-URL wird aus
  // pdf_storage_path beim ersten "Anzeigen"-Klick via Server-Proxy geladen.
  const isReadOnly = proposal.status !== "draft";
  const hasGeneratedPdf = Boolean(proposal.pdf_storage_path);
  const nextVersionNumber = (proposal.version ?? 1) + 1;

  function handleGeneratePdf() {
    setPdfError(null);
    startPdfTransition(async () => {
      const res = await generateProposalPdf(proposal.id);
      if (res.ok) {
        setPdfUrl(res.pdfUrl);
        setPdfFilename(res.filename);
      } else {
        setPdfError(res.error);
      }
    });
  }

  // Read-only-Variante: zeige bestehende PDF via Server-Proxy ohne Re-Render.
  function handleShowExistingPdf() {
    setPdfError(null);
    const cacheBuster = `${proposal.version}-${Date.now()}`;
    setPdfUrl(`/api/proposals/${proposal.id}/pdf?v=${cacheBuster}`);
    setPdfFilename(`Angebot V${proposal.version}.pdf`);
  }

  function handleClosePdf() {
    setPdfUrl(null);
    setPdfFilename(null);
  }

  function handleConfirmNewVersion() {
    setVersionError(null);
    startVersionTransition(async () => {
      const res = await createProposalVersion(proposal.id);
      if (res.ok) {
        setVersionConfirmOpen(false);
        router.push(`/proposals/${res.newProposalId}/edit`);
      } else {
        setVersionError(res.error);
      }
    });
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
        <div className="flex flex-wrap items-center gap-2">
          {isReadOnly && hasGeneratedPdf ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleShowExistingPdf}
              className="gap-1.5 font-bold"
            >
              <Eye className="h-4 w-4" />
              PDF anzeigen
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPdfPending || isReadOnly}
              onClick={handleGeneratePdf}
              className="gap-1.5 font-bold"
              title={
                isReadOnly
                  ? "PDF-Generierung nur im Status 'Entwurf' moeglich"
                  : undefined
              }
            >
              {isPdfPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {isPdfPending ? "Generiere PDF..." : "PDF generieren"}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isVersionPending}
            onClick={() => setVersionConfirmOpen(true)}
            className="gap-1.5 font-bold"
            title={`Neue Version V${nextVersionNumber} erstellen`}
          >
            {isVersionPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GitBranch className="h-4 w-4" />
            )}
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
        {versionError && (
          <div
            role="alert"
            className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700"
          >
            {versionError}
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

      <Dialog
        open={versionConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setVersionConfirmOpen(false);
            setVersionError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Neue Version V{nextVersionNumber} erstellen?</DialogTitle>
            <DialogDescription>
              Eine neue Version (V{nextVersionNumber}) wird als Entwurf angelegt — alle
              aktuellen Positionen werden uebernommen. Diese Version (V
              {proposal.version}) bleibt unveraendert.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setVersionConfirmOpen(false)}
              disabled={isVersionPending}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={handleConfirmNewVersion}
              disabled={isVersionPending}
              className="bg-[#120774] text-white hover:bg-[#0d055c]"
            >
              {isVersionPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Version erstellen"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
