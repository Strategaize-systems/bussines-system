import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Briefcase, Building2, Users, TrendingUp, Clock } from "lucide-react";

const fmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Aktiv", color: "bg-blue-100 text-blue-800" },
  won: { label: "Gewonnen", color: "bg-green-100 text-green-800" },
  lost: { label: "Verloren", color: "bg-red-100 text-red-800" },
};

export default async function DealsListPage() {
  const supabase = await createClient();

  const { data: deals } = await supabase
    .from("deals")
    .select("id, title, value, status, expected_close_date, next_action, next_action_date, created_at, contacts(id, first_name, last_name), companies(id, name), pipeline_stages(name)")
    .order("updated_at", { ascending: false });

  const allDeals = (deals ?? []) as any[];
  const activeDeals = allDeals.filter((d) => d.status === "active");
  const wonDeals = allDeals.filter((d) => d.status === "won");
  const lostDeals = allDeals.filter((d) => d.status === "lost");
  const totalValue = activeDeals.reduce((sum: number, d: any) => sum + (d.value ?? 0), 0);

  return (
    <div className="min-h-screen">
      <PageHeader title="Alle Deals" subtitle="Workspace · Übersicht aller Deals">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-xs font-bold text-blue-700">
          <Briefcase size={14} />
          {activeDeals.length} Aktiv
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700">
          <TrendingUp size={14} />
          {fmt.format(totalValue)}
        </span>
      </PageHeader>

      <main className="px-8 py-8">
        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* Active Deals */}
          {activeDeals.length > 0 && (
            <DealGroup title="Aktive Deals" count={activeDeals.length} deals={activeDeals} />
          )}

          {/* Won Deals */}
          {wonDeals.length > 0 && (
            <DealGroup title="Gewonnene Deals" count={wonDeals.length} deals={wonDeals} />
          )}

          {/* Lost Deals */}
          {lostDeals.length > 0 && (
            <DealGroup title="Verlorene Deals" count={lostDeals.length} deals={lostDeals} />
          )}

          {allDeals.length === 0 && (
            <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-12 text-center">
              <Briefcase size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-500">Noch keine Deals vorhanden</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function DealGroup({ title, count, deals }: { title: string; count: number; deals: any[] }) {
  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#120774] to-[#4454b8] flex items-center justify-center">
          <Briefcase size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">{title}</h3>
        <span className="text-xs font-bold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">{count}</span>
      </div>
      <div className="divide-y divide-slate-50">
        {deals.map((deal: any) => {
          const status = statusConfig[deal.status] ?? statusConfig.active;
          const contact = Array.isArray(deal.contacts) ? deal.contacts[0] : deal.contacts;
          const company = Array.isArray(deal.companies) ? deal.companies[0] : deal.companies;
          const stage = Array.isArray(deal.pipeline_stages) ? deal.pipeline_stages[0] : deal.pipeline_stages;

          return (
            <Link
              key={deal.id}
              href={`/deals/${deal.id}`}
              className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">{deal.title}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  {stage?.name && <span>{stage.name}</span>}
                  {company?.name && (
                    <span className="flex items-center gap-1">
                      <Building2 size={10} />
                      {company.name}
                    </span>
                  )}
                  {contact && (
                    <span className="flex items-center gap-1">
                      <Users size={10} />
                      {contact.first_name} {contact.last_name}
                    </span>
                  )}
                  {deal.next_action && (
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {deal.next_action}
                    </span>
                  )}
                </div>
              </div>
              {deal.value != null && (
                <span className="text-sm font-bold text-slate-700 shrink-0">
                  {fmt.format(deal.value)}
                </span>
              )}
              <Badge className={`${status.color} shrink-0`}>{status.label}</Badge>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
