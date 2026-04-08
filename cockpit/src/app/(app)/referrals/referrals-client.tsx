"use client";

import { useMemo, useTransition, useState } from "react";
import { Users, Trash2, Calendar, ArrowRight, Plus, GitBranch, Trophy, Target } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard, KPIGrid } from "@/components/ui/kpi-card";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ReferralSheet } from "./referral-sheet";
import { deleteReferral, type Referral } from "./actions";
import Link from "next/link";

const outcomeConfig: Record<string, { label: string; variant: string }> = {
  offen: { label: "Offen", variant: "bg-blue-100 text-blue-700 border-blue-200" },
  gewonnen: { label: "Gewonnen", variant: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  verloren: { label: "Verloren", variant: "bg-red-100 text-red-700 border-red-200" },
  nicht_qualifiziert: { label: "Nicht qualifiziert", variant: "bg-slate-100 text-slate-600 border-slate-200" },
};

interface ReferralsClientProps {
  referrals: Referral[];
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  deals: { id: string; title: string }[];
}

export function ReferralsClient({ referrals, contacts, companies, deals }: ReferralsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("");
  const [showNew, setShowNew] = useState(false);

  const filtered = useMemo(() => {
    let result = referrals;
    if (outcomeFilter) result = result.filter((r) => r.outcome === outcomeFilter);
    return result;
  }, [referrals, outcomeFilter]);

  return (
    <div className="min-h-screen">
      <PageHeader title="Empfehlungen" subtitle={`${referrals.length} Empfehlungen · Referral Tracking`}>
        <button onClick={() => setShowNew(true)} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#00a84f] to-[#4dcb8b] text-white text-sm font-bold hover:shadow-lg transition-all flex items-center gap-2">
          <Plus size={16} strokeWidth={2.5} /> Neue Empfehlung
        </button>
      </PageHeader>
      <main className="px-8 py-8">
        <div className="max-w-[1800px] mx-auto space-y-6">
          <KPIGrid columns={3}>
            <KPICard label="Gesamt" value={referrals.length} icon={GitBranch} gradient="blue" />
            <KPICard label="Gewonnen" value={referrals.filter((r) => r.outcome === "gewonnen").length} icon={Trophy} gradient="green" />
            <KPICard label="Offen" value={referrals.filter((r) => r.outcome === "offen" || !r.outcome).length} icon={Target} gradient="yellow" />
          </KPIGrid>
          <FilterBar searchPlaceholder="Empfehlung suchen..." searchValue={searchQuery} onSearchChange={setSearchQuery}>
            <FilterSelect value={outcomeFilter} onChange={setOutcomeFilter} options={[
              { value: "", label: "Alle Ergebnisse" }, { value: "offen", label: "Offen" },
              { value: "gewonnen", label: "Gewonnen" }, { value: "verloren", label: "Verloren" },
            ]} />
          </FilterBar>
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
            {filtered.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {filtered.map((ref) => <ReferralRow key={ref.id} referral={ref} />)}
              </div>
            ) : (
              <div className="p-12 text-center">
                <GitBranch size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-500">Keine Empfehlungen gefunden</p>
              </div>
            )}
          </div>
        </div>
      </main>
      {showNew && <ReferralSheet contacts={contacts} companies={companies} deals={deals} defaultOpen onOpenChange={(open: boolean) => { if (!open) setShowNew(false); }} />}
    </div>
  );
}

function ReferralRow({ referral }: { referral: Referral }) {
  const [isPending, startTransition] = useTransition();
  const outcome = outcomeConfig[referral.outcome || "offen"] || outcomeConfig.offen;
  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors group">
      <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0"><Users size={18} strokeWidth={2} /></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          {referral.referrer && <Link href={`/contacts/${referral.referrer.id}`} className="font-bold text-slate-900 hover:text-[#4454b8]">{referral.referrer.first_name} {referral.referrer.last_name}</Link>}
          <ArrowRight size={12} className="text-slate-400" />
          {referral.referred_contact && <Link href={`/contacts/${referral.referred_contact.id}`} className="font-medium text-slate-700 hover:text-[#4454b8]">{referral.referred_contact.first_name} {referral.referred_contact.last_name}</Link>}
          {referral.referred_company && <Link href={`/companies/${referral.referred_company.id}`} className="font-medium text-slate-700 hover:text-[#4454b8]">{referral.referred_company.name}</Link>}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${outcome.variant}`}>{outcome.label}</span>
          {referral.referral_date && <span className="text-[11px] text-slate-500 flex items-center gap-1"><Calendar size={10} />{new Date(referral.referral_date).toLocaleDateString("de-DE")}</span>}
        </div>
      </div>
      <button onClick={() => startTransition(async () => { await deleteReferral(referral.id); })} disabled={isPending} className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
    </div>
  );
}
