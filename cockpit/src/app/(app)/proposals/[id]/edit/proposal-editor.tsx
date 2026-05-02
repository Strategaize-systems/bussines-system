"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Save, Check, AlertCircle, Loader2, ArrowLeft } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  updateProposal,
  type Proposal,
  type ProposalEditPayload,
} from "@/app/(app)/proposals/actions";
import { useDebouncedCallback } from "@/lib/utils/use-debounce";
import type { PaymentMilestone } from "@/types/proposal-payment";
import { PaymentTermsDropdown } from "./payment-terms-dropdown";
import { SkontoSection } from "./skonto-section";
import { SplitPlanSection } from "./split-plan-section";
import { useSkontoMutex } from "./use-skonto-mutex";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type EditorPatch = {
  title?: string;
  tax_rate?: 0 | 7 | 19;
  valid_until?: string | null;
  payment_terms?: string | null;
  skonto_percent?: number | null;
  skonto_days?: number | null;
  notes?: string | null;
};

type ProposalEditorProps = {
  proposal: Proposal;
  deal: ProposalEditPayload["deal"];
  company: ProposalEditPayload["company"];
  contact: ProposalEditPayload["contact"];
  milestones: PaymentMilestone[];
  totalGross: number;
  onProposalChange: (patch: EditorPatch) => void;
  onMilestonesChange: (next: PaymentMilestone[]) => void;
  readonly?: boolean;
};

export function ProposalEditor({
  proposal,
  deal,
  company,
  contact,
  milestones,
  totalGross,
  onProposalChange,
  onMilestonesChange,
  readonly = false,
}: ProposalEditorProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const persistPatch = useCallback(
    async (patch: EditorPatch) => {
      setSaveStatus("saving");
      const res = await updateProposal(proposal.id, patch);
      if (res.ok) {
        setSaveStatus("saved");
        setErrorMessage(null);
      } else {
        setSaveStatus("error");
        setErrorMessage(res.error);
      }
    },
    [proposal.id],
  );

  const debouncedPersist = useDebouncedCallback(persistPatch, 500);

  const patchAndSave = useCallback(
    (patch: EditorPatch) => {
      onProposalChange(patch);
      debouncedPersist(patch);
    },
    [onProposalChange, debouncedPersist],
  );

  const taxRate = (proposal.tax_rate as 0 | 7 | 19) ?? 19;
  // V5.6 SLC-563 — Mutex aktiv sobald ein Vorkasse-Milestone (100% on_signature)
  // existiert. Toggle-State + Werte werden auto-clearend, wenn der Mutex
  // false → true wechselt (DEC-116).
  const skontoMutex = useSkontoMutex(milestones);
  const prevMutexRef = useRef(skontoMutex);

  useEffect(() => {
    const wasActive = prevMutexRef.current;
    prevMutexRef.current = skontoMutex;
    if (readonly) return;
    if (!wasActive && skontoMutex) {
      const hadValues =
        proposal.skonto_percent !== null || proposal.skonto_days !== null;
      if (hadValues) {
        patchAndSave({ skonto_percent: null, skonto_days: null });
      }
    }
  }, [skontoMutex, readonly, proposal.skonto_percent, proposal.skonto_days, patchAndSave]);

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-5 py-4 border-b-2 border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/proposals"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            aria-label="Zur Angebotsliste"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Editor</h3>
              <span className="inline-flex items-center rounded-md bg-gradient-to-r from-[#120774] to-[#4454b8] px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                V{proposal.version}
              </span>
            </div>
            {proposal.parent_proposal_id && (
              <Link
                href={`/proposals/${proposal.parent_proposal_id}/edit`}
                className="text-[11px] font-medium text-[#4454b8] hover:underline"
              >
                Vorgaenger ansehen
              </Link>
            )}
          </div>
        </div>
        {readonly ? (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            Nur Anzeige
          </span>
        ) : (
          <SaveIndicator status={saveStatus} message={errorMessage} />
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <RecipientBlock deal={deal} company={company} contact={contact} />

        <Field label="Titel" htmlFor="proposal-title">
          <Input
            id="proposal-title"
            value={proposal.title}
            onChange={(e) => patchAndSave({ title: e.target.value })}
            maxLength={255}
            placeholder="z.B. Coaching-Programm 2026"
            disabled={readonly}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Steuersatz" htmlFor="proposal-tax">
            <select
              id="proposal-tax"
              value={taxRate}
              onChange={(e) => {
                const v = Number(e.target.value) as 0 | 7 | 19;
                patchAndSave({ tax_rate: v });
              }}
              disabled={readonly}
              className="h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:border-[#4454b8] focus:ring-2 focus:ring-[#4454b8]/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value={19}>19%</option>
              <option value={7}>7%</option>
              <option value={0}>0%</option>
            </select>
          </Field>
          <Field label="Gueltig bis" htmlFor="proposal-valid-until">
            <Input
              id="proposal-valid-until"
              type="date"
              value={proposal.valid_until ?? ""}
              onChange={(e) =>
                patchAndSave({ valid_until: e.target.value || null })
              }
              disabled={readonly}
            />
          </Field>
        </div>

        <Field label="Zahlungsbedingungen" htmlFor="proposal-payment-terms">
          <div className="space-y-3">
            <PaymentTermsDropdown
              disabled={readonly}
              onSelectTemplate={(body) =>
                patchAndSave({ payment_terms: body })
              }
            />
            <Textarea
              id="proposal-payment-terms"
              value={proposal.payment_terms ?? ""}
              onChange={(e) =>
                patchAndSave({ payment_terms: e.target.value || null })
              }
              placeholder="z.B. 30 Tage netto"
              rows={3}
              maxLength={2000}
              disabled={readonly}
            />
          </div>
        </Field>

        <SplitPlanSection
          milestones={milestones}
          totalGross={totalGross}
          onChange={onMilestonesChange}
          disabled={readonly}
        />

        {skontoMutex && !readonly && (
          <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Skonto deaktiviert — bei 100% Vorkasse ist Skonto nicht anwendbar.
          </p>
        )}

        <SkontoSection
          skonto_percent={proposal.skonto_percent}
          skonto_days={proposal.skonto_days}
          disabled={readonly || skontoMutex}
          onChange={(percent, days) =>
            patchAndSave({ skonto_percent: percent, skonto_days: days })
          }
        />
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={htmlFor}
        className="text-[11px] font-bold uppercase tracking-wide text-slate-500"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

function RecipientBlock({
  deal,
  company,
  contact,
}: {
  deal: ProposalEditPayload["deal"];
  company: ProposalEditPayload["company"];
  contact: ProposalEditPayload["contact"];
}) {
  return (
    <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        Empfaenger
      </div>
      {contact ? (
        <div className="font-semibold text-slate-900">
          {contact.first_name} {contact.last_name}
        </div>
      ) : (
        <div className="text-slate-400 italic">Kein Kontakt verknuepft</div>
      )}
      {company && (
        <div className="text-slate-700">{company.name}</div>
      )}
      {deal && (
        <Link
          href={`/deals/${deal.id}`}
          className="text-[11px] text-blue-600 hover:underline inline-block mt-1"
        >
          Deal: {deal.title}
        </Link>
      )}
      <div className="text-[10px] text-slate-400 mt-2">
        Empfaenger werden im Deal/Kontakt verwaltet.
      </div>
    </div>
  );
}

function SaveIndicator({
  status,
  message,
}: {
  status: SaveStatus;
  message: string | null;
}) {
  if (status === "saving")
    return (
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Speichert...
      </span>
    );
  if (status === "saved")
    return (
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
        <Check className="h-3.5 w-3.5" /> Gespeichert
      </span>
    );
  if (status === "error")
    return (
      <span
        className="flex items-center gap-1.5 text-[11px] font-semibold text-red-600"
        title={message ?? ""}
      >
        <AlertCircle className="h-3.5 w-3.5" /> Fehler
      </span>
    );
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
      <Save className="h-3.5 w-3.5" /> Auto-Save aktiv
    </span>
  );
}
