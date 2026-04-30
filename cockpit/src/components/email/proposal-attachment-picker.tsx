"use client";

// =============================================================
// ProposalAttachmentPicker (SLC-555 MT-3)
// =============================================================
// Modal mit Liste aller Angebote des aktuellen Deals (DEC-112: alle Status
// sichtbar). User waehlt eines aus → `attachProposalToCompose` Server Action
// → Anhang wird via `onSelect` zurueck an die `<AttachmentsSection>` gegeben.
//
// Edge-Cases:
//   - dealId == null → leere Liste mit Hinweis "Kein Deal verknuepft"
//   - Angebot ohne PDF (`pdf_storage_path == null`) → Item disabled mit
//     Tooltip "PDF noch nicht generiert"
//   - Status `expired` oder `rejected` → Confirm-Modal "Trotzdem anhaengen?"
//   - Status `accepted` → Hinweis "Bereits angenommen — i.d.R. nicht mehr
//     versenden noetig" (kein Hard-Block, nur Warnung)
//
// Loader: Client-side Fetch via `useEffect` beim Open. Bei jedem Re-Open wird
// die Liste neu geladen, damit frisch generierte PDFs sichtbar werden ohne
// Page-Reload. Loading + Error-States explizit gerendert.

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  AlertCircle,
  Calendar,
  FileText,
  Loader2,
  Paperclip,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProposalStatusBadge } from "@/components/proposal/proposal-status-badge";
import { attachProposalToCompose } from "@/app/(app)/emails/compose/attachment-actions";
import {
  getProposalsForDeal,
  type ProposalForPicker,
} from "@/app/(app)/proposals/actions";
import type { AttachmentMeta } from "@/lib/email/attachments-whitelist";

type Props = {
  composeSessionId: string;
  dealId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (attachment: AttachmentMeta) => void;
};

const WARN_STATUS = new Set(["expired", "rejected"]);

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function ProposalAttachmentPicker({
  composeSessionId,
  dealId,
  open,
  onOpenChange,
  onSelect,
}: Props) {
  const [items, setItems] = useState<ProposalForPicker[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<ProposalForPicker | null>(
    null,
  );
  const [attachError, setAttachError] = useState<string | null>(null);
  const [attachPending, startAttachTransition] = useTransition();

  // Liste neu laden bei jedem Open. dealId==null → leere Liste, kein Fetch.
  useEffect(() => {
    if (!open) return;
    setAttachError(null);
    setConfirmTarget(null);
    if (!dealId) {
      setItems([]);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const list = await getProposalsForDeal(dealId);
        if (!cancelled) setItems(list);
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : "Unbekannter Fehler beim Laden.",
          );
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, dealId]);

  const performAttach = useCallback(
    (proposal: ProposalForPicker) => {
      setAttachError(null);
      startAttachTransition(async () => {
        const res = await attachProposalToCompose({
          composeSessionId,
          proposalId: proposal.id,
        });
        if (!res.ok) {
          setAttachError(res.error);
          return;
        }
        onSelect(res.attachment);
        setConfirmTarget(null);
        onOpenChange(false);
      });
    },
    [composeSessionId, onOpenChange, onSelect],
  );

  const handleSelect = useCallback(
    (proposal: ProposalForPicker) => {
      if (!proposal.pdf_storage_path) {
        // Disabled-Items sollten gar nicht klickbar sein; defensive Branch.
        setAttachError(
          "Fuer dieses Angebot wurde noch keine PDF generiert. Bitte zuerst im Workspace PDF generieren.",
        );
        return;
      }
      if (WARN_STATUS.has(proposal.status)) {
        setConfirmTarget(proposal);
        return;
      }
      performAttach(proposal);
    },
    [performAttach],
  );

  const renderEmpty = () => {
    if (!dealId) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
          <Paperclip
            className="h-6 w-6 text-slate-400"
            strokeWidth={2}
          />
          <p className="text-sm font-semibold text-slate-700">
            Kein Deal verknuepft
          </p>
          <p className="text-xs text-slate-500">
            Angebot-Anhang ist nur mit Deal-Kontext moeglich.
          </p>
        </div>
      );
    }
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#4454b8]" strokeWidth={2.5} />
          <p className="text-xs font-semibold text-slate-500">
            Angebote werden geladen...
          </p>
        </div>
      );
    }
    if (loadError) {
      return (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
          <span>{loadError}</span>
        </div>
      );
    }
    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
          <FileText className="h-6 w-6 text-slate-400" strokeWidth={2} />
          <p className="text-sm font-semibold text-slate-700">
            Keine Angebote vorhanden
          </p>
          <p className="text-xs text-slate-500">
            Erstelle ein Angebot im Deal-Kontext, um es hier anzuhaengen.
          </p>
        </div>
      );
    }
    return null;
  };

  const empty = renderEmpty();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#4454b8]" strokeWidth={2.5} />
              Angebot anhaengen
            </DialogTitle>
            <DialogDescription>
              Waehle ein Angebot aus diesem Deal — die generierte PDF wird als
              Anhang in die E-Mail uebernommen.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {empty}
            {!empty &&
              items.map((p) => {
                const noPdf = !p.pdf_storage_path;
                const warn = WARN_STATUS.has(p.status);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelect(p)}
                    disabled={noPdf || attachPending}
                    className={
                      "w-full text-left rounded-lg border-2 px-3 py-2.5 transition-all " +
                      (noPdf
                        ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                        : "border-slate-200 bg-white hover:border-[#4454b8] hover:shadow-sm")
                    }
                    title={
                      noPdf
                        ? "PDF noch nicht generiert — bitte zuerst im Workspace generieren."
                        : warn
                        ? `Angebot ist ${p.status} — Bestaetigung erforderlich.`
                        : "Anhaengen"
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <FileText
                          className="h-4 w-4 shrink-0 text-[#4454b8]"
                          strokeWidth={2.5}
                        />
                        <span className="truncate text-sm font-bold text-slate-900">
                          {p.title}
                        </span>
                        <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                          V{p.version}
                        </span>
                      </div>
                      <ProposalStatusBadge status={p.status} />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" strokeWidth={2.5} />
                        {formatDate(p.created_at)}
                      </span>
                      {noPdf && (
                        <span className="font-semibold text-amber-600">
                          PDF noch nicht generiert
                        </span>
                      )}
                      {!noPdf && warn && (
                        <span className="font-semibold text-orange-600">
                          Bestaetigung beim Anhaengen erforderlich
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>

          {attachError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              <AlertCircle
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                strokeWidth={2.5}
              />
              <span>{attachError}</span>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={attachPending}
            >
              Abbrechen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm-Sub-Dialog fuer expired/rejected — bewusst getrennt vom
          Haupt-Dialog, damit die Liste sichtbar bleibt. */}
      {confirmTarget && (
        <Dialog
          open={!!confirmTarget}
          onOpenChange={(o) => {
            if (!o) setConfirmTarget(null);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-700">
                <AlertCircle className="h-4 w-4" strokeWidth={2.5} />
                Achtung — Angebot ist {confirmTarget.status}
              </DialogTitle>
              <DialogDescription>
                Dieses Angebot ist {confirmTarget.status === "expired"
                  ? "abgelaufen"
                  : "abgelehnt"}
                . Trotzdem anhaengen und versenden?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmTarget(null)}
                disabled={attachPending}
              >
                Abbrechen
              </Button>
              <Button
                type="button"
                onClick={() => performAttach(confirmTarget)}
                disabled={attachPending}
                className="bg-orange-600 text-white hover:bg-orange-700"
              >
                {attachPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
                ) : null}
                Trotzdem anhaengen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
