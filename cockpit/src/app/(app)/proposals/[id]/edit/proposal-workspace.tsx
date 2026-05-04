"use client";

// V5.5 SLC-554: Workspace mit Status-Lifecycle + Versionen-Header.
// Top-Bar haelt:
//   - Status-Badge (aktueller Lifecycle-Status, V5.5-Color-Mapping)
//   - Versions-Liste (Click-Through zu V1/V2/...)
//   - Action-Buttons abhaengig vom aktuellen Status:
//       draft  → "Als versendet markieren"
//       sent   → "Als angenommen markieren" + "Als abgelehnt markieren"
//       sonst  → keine Buttons (Read-only)
// Read-only-Mode disabled Editor-Inputs + Item-CRUD; "Neue Version erstellen"
// bleibt verfuegbar (PreviewPanel triggert die Server Action).

import { useCallback, useMemo, useState, useTransition } from "react";
import { Send, ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";

import { ProposalPositionList } from "./position-list";
import { ProposalEditor } from "./proposal-editor";
import { ProposalPreviewPanel } from "./preview-panel";
import { ProposalStatusBadge } from "@/components/proposal/proposal-status-badge";
import { ProposalVersionsList } from "@/components/proposal/proposal-versions-list";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  saveProposalPaymentMilestones,
  transitionProposalStatus,
} from "@/app/(app)/proposals/actions";
import type {
  Proposal,
  ProposalItem,
  ProposalEditPayload,
  ProposalVersionEntry,
} from "@/app/(app)/proposals/actions";
import { calculateTotals } from "@/lib/proposal/calc";
import {
  validateMilestoneTrigger,
  validateMilestonesSum,
  type MilestoneInput,
} from "@/lib/proposal/milestones-validation";
import { useDebouncedCallback } from "@/lib/utils/use-debounce";
import type { Product } from "@/types/products";
import type { PaymentMilestone } from "@/types/proposal-payment";

type MobileTab = "positions" | "editor" | "preview";

type EditorPatch = {
  title?: string;
  tax_rate?: 0 | 7 | 9 | 19 | 21;
  valid_until?: string | null;
  payment_terms?: string | null;
  skonto_percent?: number | null;
  skonto_days?: number | null;
  // V5.7 SLC-571 (DEC-126).
  reverse_charge?: boolean;
};

type ProposalWorkspaceProps = {
  payload: ProposalEditPayload;
  products: Product[];
  versions: ProposalVersionEntry[];
  readonly: boolean;
};

type TransitionTarget = "sent" | "accepted" | "rejected";

const TRANSITION_LABELS: Record<TransitionTarget, { button: string; confirmTitle: string; confirmBody: string }> = {
  sent: {
    button: "Als versendet markieren",
    confirmTitle: "Angebot als versendet markieren?",
    confirmBody:
      "Das Angebot wird auf Status 'Versendet' gesetzt. Datum = heute. Editor-Felder werden danach gesperrt.",
  },
  accepted: {
    button: "Als angenommen markieren",
    confirmTitle: "Angebot als angenommen markieren?",
    confirmBody:
      "Das Angebot wird auf Status 'Angenommen' gesetzt. Diese Aktion ist final — eine spaetere Aenderung erfordert eine neue Version.",
  },
  rejected: {
    button: "Als abgelehnt markieren",
    confirmTitle: "Angebot als abgelehnt markieren?",
    confirmBody:
      "Das Angebot wird auf Status 'Abgelehnt' gesetzt. Diese Aktion ist final.",
  },
};

export function ProposalWorkspace({
  payload,
  products,
  versions,
  readonly,
}: ProposalWorkspaceProps) {
  const [proposal, setProposal] = useState<Proposal>(payload.proposal);
  const [items, setItems] = useState<ProposalItem[]>(payload.items);
  // V5.6 SLC-563: Milestones-State + Auto-Save. Auto-Save fired nur bei
  // gueltigem Plan (Sum=100% strict + alle Trigger valid). Bei invalidem
  // Plan zeigt der SumIndicator den Diff, Server bleibt auf letztem
  // gueltigen Stand.
  const [milestones, setMilestones] = useState<PaymentMilestone[]>(payload.milestones);
  const [milestonesError, setMilestonesError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("editor");
  const [pendingTransition, setPendingTransition] = useState<TransitionTarget | null>(null);
  const [actionMessage, setActionMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [isTransitioning, startTransition] = useTransition();

  // Snapshot-Total fuer Milestone-Amounts (DEC-115/116). Berechnet aus dem
  // aktuellen Editor-State, damit der zuletzt gesehene Brutto in DB landet.
  const totals = useMemo(
    () => calculateTotals(items, proposal.tax_rate ?? 19),
    [items, proposal.tax_rate],
  );

  const persistMilestones = useCallback(
    async (next: PaymentMilestone[], totalGross: number) => {
      const inputs: MilestoneInput[] = next.map((m) => ({
        sequence: m.sequence,
        percent: m.percent,
        due_trigger: m.due_trigger,
        due_offset_days: m.due_offset_days,
        label: m.label,
      }));

      // Pre-flight validation: nur bei gueltigem Plan persistieren.
      // Empty-Plan ist explizit valid (length === 0 → DELETE all serverseitig).
      if (inputs.length > 0) {
        for (const m of inputs) {
          const trig = validateMilestoneTrigger(m);
          if (!trig.ok) return;
        }
        const sum = validateMilestonesSum(inputs);
        if (!sum.ok) return;
      }

      const res = await saveProposalPaymentMilestones({
        proposalId: proposal.id,
        milestones: inputs,
        totalGross,
      });
      if (res.ok) {
        setMilestonesError(null);
      } else {
        setMilestonesError(res.error);
      }
    },
    [proposal.id],
  );

  const debouncedPersistMilestones = useDebouncedCallback(persistMilestones, 500);

  const handleProposalChange = useCallback((patch: EditorPatch) => {
    setProposal((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleItemsChange = useCallback((next: ProposalItem[]) => {
    setItems(next);
  }, []);

  const handleMilestonesChange = useCallback(
    (next: PaymentMilestone[]) => {
      setMilestones(next);
      debouncedPersistMilestones(next, totals.total);
    },
    [debouncedPersistMilestones, totals.total],
  );

  const confirmTransition = useCallback(() => {
    if (!pendingTransition) return;
    const target = pendingTransition;
    setPendingTransition(null);
    setActionMessage(null);
    startTransition(async () => {
      const res = await transitionProposalStatus(proposal.id, target);
      if (res.ok) {
        setProposal((prev) => ({
          ...prev,
          status: target,
          [`${target}_at`]: new Date().toISOString(),
        }));
        setActionMessage({
          kind: "ok",
          text:
            target === "sent"
              ? "Status auf 'Versendet' gesetzt."
              : target === "accepted"
              ? "Status auf 'Angenommen' gesetzt."
              : "Status auf 'Abgelehnt' gesetzt.",
        });
      } else {
        setActionMessage({ kind: "error", text: res.error });
      }
    });
  }, [pendingTransition, proposal.id]);

  const positionListSlot = (
    <ProposalPositionList
      proposalId={proposal.id}
      items={items}
      taxRate={proposal.tax_rate ?? 19}
      products={products}
      onItemsChange={handleItemsChange}
      readonly={readonly}
    />
  );

  const editorSlot = (
    <ProposalEditor
      proposal={proposal}
      deal={payload.deal}
      company={payload.company}
      contact={payload.contact}
      branding={payload.branding}
      milestones={milestones}
      totalGross={totals.total}
      onProposalChange={handleProposalChange}
      onMilestonesChange={handleMilestonesChange}
      readonly={readonly}
    />
  );

  const previewSlot = (
    <ProposalPreviewPanel
      proposal={proposal}
      items={items}
      branding={payload.branding}
      company={payload.company}
      contact={payload.contact}
    />
  );

  const status = proposal.status;
  const showSent = status === "draft";
  const showAccept = status === "sent";
  const showReject = status === "sent";
  const hasAnyAction = showSent || showAccept || showReject;

  return (
    <>
      {/* Top-Bar: Status + Versionen + Actions */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <ProposalStatusBadge status={status} />
          <ProposalVersionsList versions={versions} currentProposalId={proposal.id} />
          {readonly && status !== "draft" && (
            <span className="text-[11px] font-semibold text-slate-500">
              Anzeigemodus — Editor gesperrt
            </span>
          )}
        </div>

        {hasAnyAction && (
          <div className="flex flex-wrap items-center gap-2">
            {showSent && (
              <Button
                type="button"
                size="sm"
                disabled={isTransitioning}
                onClick={() => setPendingTransition("sent")}
                className="gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600"
              >
                {isTransitioning && pendingTransition === null ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {TRANSITION_LABELS.sent.button}
              </Button>
            )}
            {showAccept && (
              <Button
                type="button"
                size="sm"
                disabled={isTransitioning}
                onClick={() => setPendingTransition("accepted")}
                className="gap-1.5 bg-emerald-700 text-white hover:bg-emerald-800"
              >
                <ThumbsUp className="h-4 w-4" />
                {TRANSITION_LABELS.accepted.button}
              </Button>
            )}
            {showReject && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isTransitioning}
                onClick={() => setPendingTransition("rejected")}
                className="gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50"
              >
                <ThumbsDown className="h-4 w-4" />
                {TRANSITION_LABELS.rejected.button}
              </Button>
            )}
          </div>
        )}
      </div>

      {actionMessage && (
        <div
          role="status"
          className={
            actionMessage.kind === "ok"
              ? "mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"
              : "mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800"
          }
        >
          {actionMessage.text}
        </div>
      )}

      {milestonesError && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800"
        >
          Teilzahlungs-Plan konnte nicht gespeichert werden: {milestonesError}
        </div>
      )}

      {/* Desktop: 3-Panel-Grid */}
      <div className="hidden md:grid md:grid-cols-[360px_minmax(0,1fr)_500px] md:gap-4 md:h-[calc(100vh-260px)]">
        <aside className="min-h-0">{positionListSlot}</aside>
        <main className="min-h-0">{editorSlot}</main>
        <aside className="min-h-0">{previewSlot}</aside>
      </div>

      {/* Mobile: Stacked Tabs */}
      <div className="md:hidden">
        <div className="mb-4 flex gap-1 rounded-lg border-2 border-slate-200 bg-slate-50 p-1 text-xs font-bold">
          {(
            [
              { key: "positions" as const, label: "Positionen" },
              { key: "editor" as const, label: "Editor" },
              { key: "preview" as const, label: "Vorschau" },
            ]
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setMobileTab(opt.key)}
              className={
                mobileTab === opt.key
                  ? "flex-1 rounded-md bg-white px-3 py-2 text-[#120774] shadow-sm transition-all"
                  : "flex-1 rounded-md px-3 py-2 text-slate-500 transition-all hover:text-slate-900"
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="min-h-[560px]">
          {mobileTab === "positions" && positionListSlot}
          {mobileTab === "editor" && editorSlot}
          {mobileTab === "preview" && previewSlot}
        </div>
      </div>

      {/* Confirm-Dialog fuer Status-Transitions */}
      <Dialog
        open={pendingTransition !== null}
        onOpenChange={(open) => {
          if (!open) setPendingTransition(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pendingTransition && TRANSITION_LABELS[pendingTransition].confirmTitle}
            </DialogTitle>
            <DialogDescription>
              {pendingTransition && TRANSITION_LABELS[pendingTransition].confirmBody}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingTransition(null)}
              disabled={isTransitioning}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={confirmTransition}
              disabled={isTransitioning}
              className="bg-[#120774] text-white hover:bg-[#0d055c]"
            >
              {isTransitioning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Bestaetigen"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
