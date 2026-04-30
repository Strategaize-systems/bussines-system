"use client";

import { useState, useMemo, useTransition } from "react";
import { FileText, Pencil, Trash2, Trophy, XCircle, Clock, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard, KPIGrid } from "@/components/ui/kpi-card";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ProposalSheet } from "./proposal-sheet";
import { deleteProposal, type Proposal } from "./actions";
import Link from "next/link";

const statusConfig: Record<string, { label: string; variant: string }> = {
  draft: { label: "Entwurf", variant: "bg-slate-100 text-slate-600 border-slate-200" },
  sent: { label: "Versendet", variant: "bg-blue-100 text-blue-700 border-blue-200" },
  open: { label: "Offen", variant: "bg-amber-100 text-amber-700 border-amber-200" },
  negotiation: { label: "Verhandlung", variant: "bg-purple-100 text-purple-700 border-purple-200" },
  won: { label: "Gewonnen", variant: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  lost: { label: "Verloren", variant: "bg-red-100 text-red-700 border-red-200" },
};

interface ProposalsClientProps {
  proposals: Proposal[];
  deals: { id: string; title: string }[];
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
}

export function ProposalsClient({ proposals, deals, contacts, companies }: ProposalsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showNew, setShowNew] = useState(false);

  const filtered = useMemo(() => {
    let result = proposals;
    if (searchQuery) { const q = searchQuery.toLowerCase(); result = result.filter((p) => p.title.toLowerCase().includes(q)); }
    if (statusFilter) result = result.filter((p) => p.status === statusFilter);
    return result;
  }, [proposals, searchQuery, statusFilter]);

  return (
    <div className="min-h-screen">
      <PageHeader title="Angebote" subtitle={`${proposals.length} Angebote gesamt`}>
        <button onClick={() => setShowNew(true)} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#00a84f] to-[#4dcb8b] text-white text-sm font-bold hover:shadow-lg transition-all flex items-center gap-2">
          <Plus size={16} strokeWidth={2.5} /> Neues Angebot
        </button>
      </PageHeader>
      <main className="px-8 py-8">
        <div className="max-w-[1800px] mx-auto space-y-6">
          <KPIGrid columns={3}>
            <KPICard label="Aktiv" value={proposals.filter((p) => !["won", "lost"].includes(p.status)).length} icon={Clock} gradient="blue" />
            <KPICard label="Gewonnen" value={proposals.filter((p) => p.status === "won").length} icon={Trophy} gradient="green" />
            <KPICard label="Verloren" value={proposals.filter((p) => p.status === "lost").length} icon={XCircle} gradient="red" />
          </KPIGrid>
          <FilterBar searchPlaceholder="Angebot suchen..." searchValue={searchQuery} onSearchChange={setSearchQuery}>
            <FilterSelect value={statusFilter} onChange={setStatusFilter} options={[
              { value: "", label: "Alle Status" }, { value: "draft", label: "Entwurf" }, { value: "sent", label: "Versendet" },
              { value: "open", label: "Offen" }, { value: "won", label: "Gewonnen" }, { value: "lost", label: "Verloren" },
            ]} />
          </FilterBar>
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
            {filtered.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {filtered.map((p) => <ProposalRow key={p.id} proposal={p} deals={deals} contacts={contacts} companies={companies} />)}
              </div>
            ) : (
              <div className="p-12 text-center">
                <FileText size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-500">Keine Angebote gefunden</p>
              </div>
            )}
          </div>
        </div>
      </main>
      {showNew && <ProposalSheet deals={deals} contacts={contacts} companies={companies} defaultOpen onOpenChange={(open: boolean) => { if (!open) setShowNew(false); }} />}
    </div>
  );
}

function ProposalRow({ proposal, deals, contacts, companies }: { proposal: Proposal; deals: any[]; contacts: any[]; companies: any[] }) {
  const [isPending, startTransition] = useTransition();
  const st = statusConfig[proposal.status] ?? statusConfig.draft;
  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors group">
      <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><FileText size={18} strokeWidth={2} /></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900">{proposal.title}</span>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">V{proposal.version}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${st.variant}`}>{st.label}</span>
          {proposal.price_range && <span className="text-[11px] font-semibold text-slate-600">{proposal.price_range}</span>}
        </div>
      </div>
      {proposal.contacts && <Link href={`/contacts/${proposal.contacts.id}`} className="text-xs font-medium text-slate-600 shrink-0" onClick={(e) => e.stopPropagation()}>{proposal.contacts.first_name} {proposal.contacts.last_name}</Link>}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {proposal.status === "draft" && (
          <Link
            href={`/proposals/${proposal.id}/edit`}
            className="px-2.5 py-1 rounded-md bg-[#120774] text-white text-[11px] font-bold hover:bg-[#0d055c] transition-colors flex items-center gap-1.5"
            title="Angebot im Workspace bearbeiten"
          >
            <Pencil size={12} />
            Bearbeiten
          </Link>
        )}
        <ProposalSheet deals={deals} contacts={contacts} companies={companies} proposal={proposal} trigger={
          <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title="Schnell-Edit (Legacy)"><Pencil size={14} /></button>
        } />
        <button onClick={() => startTransition(async () => { await deleteProposal(proposal.id); })} disabled={isPending} className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}
