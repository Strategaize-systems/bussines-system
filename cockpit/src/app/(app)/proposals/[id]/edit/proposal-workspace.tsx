"use client";

import { useCallback, useState } from "react";

import { ProposalPositionList } from "./position-list";
import { ProposalEditor } from "./proposal-editor";
import { ProposalPreviewPanel } from "./preview-panel";
import type {
  Proposal,
  ProposalItem,
  ProposalEditPayload,
} from "@/app/(app)/proposals/actions";
import type { Product } from "@/types/products";

type MobileTab = "positions" | "editor" | "preview";

type EditorPatch = {
  title?: string;
  tax_rate?: 0 | 7 | 19;
  valid_until?: string | null;
  payment_terms?: string | null;
};

type ProposalWorkspaceProps = {
  payload: ProposalEditPayload;
  products: Product[];
};

export function ProposalWorkspace({ payload, products }: ProposalWorkspaceProps) {
  const [proposal, setProposal] = useState<Proposal>(payload.proposal);
  const [items, setItems] = useState<ProposalItem[]>(payload.items);
  const [mobileTab, setMobileTab] = useState<MobileTab>("editor");

  const handleProposalChange = useCallback((patch: EditorPatch) => {
    setProposal((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleItemsChange = useCallback((next: ProposalItem[]) => {
    setItems(next);
  }, []);

  const positionListSlot = (
    <ProposalPositionList
      proposalId={proposal.id}
      items={items}
      taxRate={proposal.tax_rate ?? 19}
      products={products}
      onItemsChange={handleItemsChange}
    />
  );

  const editorSlot = (
    <ProposalEditor
      proposal={proposal}
      deal={payload.deal}
      company={payload.company}
      contact={payload.contact}
      onProposalChange={handleProposalChange}
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

  return (
    <>
      {/* Desktop: 3-Panel-Grid */}
      <div className="hidden md:grid md:grid-cols-[360px_minmax(0,1fr)_500px] md:gap-4 md:h-[calc(100vh-180px)]">
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

    </>
  );
}
