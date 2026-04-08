"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  ArrowRightLeft, Plus, Trash2, CheckCircle2, Clock, Building2, Target,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard, KPIGrid } from "@/components/ui/kpi-card";
import { FilterBar } from "@/components/ui/filter-bar";
import { createHandoff, updateHandoffStatus, deleteHandoff, type Handoff } from "./actions";
import Link from "next/link";

const statusConfig: Record<string, { label: string; variant: string }> = {
  pending: { label: "Ausstehend", variant: "bg-amber-100 text-amber-700 border-amber-200" },
  in_progress: { label: "In Übergabe", variant: "bg-blue-100 text-blue-700 border-blue-200" },
  completed: { label: "Abgeschlossen", variant: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

interface HandoffsClientProps {
  handoffs: Handoff[];
  deals: { id: string; title: string }[];
  companies: { id: string; name: string }[];
}

export function HandoffsClient({ handoffs, deals, companies }: HandoffsClientProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");

  const pendingCount = handoffs.filter((h) => h.status === "pending").length;
  const inProgressCount = handoffs.filter((h) => h.status === "in_progress").length;
  const completedCount = handoffs.filter((h) => h.status === "completed").length;

  const handleSubmit = (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const result = await createHandoff(formData);
      if (result.error) setError(result.error);
      else setOpen(false);
    });
  };

  return (
    <div className="min-h-screen">
      <PageHeader title="Übergaben" subtitle={`${handoffs.length} Übergaben · System 1 Handoff`}>
        <button onClick={() => setOpen(true)} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#00a84f] to-[#4dcb8b] text-white text-sm font-bold hover:shadow-lg transition-all flex items-center gap-2">
          <Plus size={16} strokeWidth={2.5} /> Übergabe starten
        </button>
      </PageHeader>

      <main className="px-8 py-8">
        <div className="max-w-[1800px] mx-auto space-y-6">
          <KPIGrid columns={3}>
            <KPICard label="Ausstehend" value={pendingCount} icon={Clock} gradient="yellow" />
            <KPICard label="In Übergabe" value={inProgressCount} icon={ArrowRightLeft} gradient="blue" />
            <KPICard label="Abgeschlossen" value={completedCount} icon={CheckCircle2} gradient="green" />
          </KPIGrid>

          <FilterBar searchPlaceholder="Übergabe suchen..." searchValue={searchQuery} onSearchChange={setSearchQuery} showVoice={false} showAI={false} />

          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
            {handoffs.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {handoffs.map((h) => <HandoffRow key={h.id} handoff={h} />)}
              </div>
            ) : (
              <div className="p-12 text-center">
                <ArrowRightLeft size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-500">Keine Übergaben vorhanden</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* New Handoff Sheet */}
      <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(""); }}>
        <SheetContent>
          <SheetHeader><SheetTitle>Neue Übergabe</SheetTitle></SheetHeader>
          <div className="px-8 pb-8">
            {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
            <form action={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Deal</Label>
                  <select name="deal_id" className="select-premium">{[{ id: "", title: "— Deal wählen —" }, ...deals].map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}</select>
                </div>
                <div className="space-y-2">
                  <Label>Firma</Label>
                  <select name="company_id" className="select-premium">{[{ id: "", name: "— Firma wählen —" }, ...companies].map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                </div>
              </div>
              <div className="space-y-2"><Label>Einstiegsschiene</Label><Input name="entry_track" placeholder="z.B. Blueprint Full" /></div>
              <div className="space-y-2"><Label>Vorinformationen</Label><Textarea name="pre_information" rows={2} placeholder="Relevanter Kontext für System 1" /></div>
              <div className="space-y-2"><Label>Erwartungen</Label><Textarea name="expectations" rows={2} placeholder="Was erwartet der Kunde?" /></div>
              <Button type="submit" className="w-full" disabled={isPending}>{isPending ? "Speichern..." : "Übergabe starten"}</Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function HandoffRow({ handoff }: { handoff: Handoff }) {
  const [isPending, startTransition] = useTransition();
  const st = statusConfig[handoff.status] ?? statusConfig.pending;
  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors group">
      <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><ArrowRightLeft size={18} strokeWidth={2} /></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {handoff.deals && <span className="text-sm font-bold text-slate-900">{handoff.deals.title}</span>}
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${st.variant}`}>{st.label}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
          {handoff.companies && <Link href={`/companies/${handoff.companies.id}`} className="flex items-center gap-1 hover:text-[#4454b8]"><Building2 size={10} />{handoff.companies.name}</Link>}
          {handoff.entry_track && <span>Schiene: {handoff.entry_track}</span>}
          {handoff.handed_off_at && <span className="flex items-center gap-1"><Clock size={10} />{new Date(handoff.handed_off_at).toLocaleDateString("de-DE")}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {handoff.status === "pending" && (
          <button onClick={() => startTransition(async () => { await updateHandoffStatus(handoff.id, "in_progress"); })} disabled={isPending} className="p-1.5 rounded-md hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors" title="In Übergabe"><ArrowRightLeft size={14} /></button>
        )}
        {handoff.status === "in_progress" && (
          <button onClick={() => startTransition(async () => { await updateHandoffStatus(handoff.id, "completed"); })} disabled={isPending} className="p-1.5 rounded-md hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors" title="Abschließen"><CheckCircle2 size={14} /></button>
        )}
        <button onClick={() => startTransition(async () => { await deleteHandoff(handoff.id); })} disabled={isPending} className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}
