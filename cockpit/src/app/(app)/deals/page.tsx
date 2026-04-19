import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import {
  Briefcase,
  Building2,
  Users,
  TrendingUp,
  Clock,
  Calendar,
  ArrowRight,
  ChevronRight,
} from "lucide-react";

const fmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: string; gradient: string }
> = {
  active: {
    label: "Aktiv",
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-200",
    icon: "🔥",
    gradient: "from-[#120774] to-[#4454b8]",
  },
  won: {
    label: "Gewonnen",
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    border: "border-emerald-200",
    icon: "⭐",
    gradient: "from-[#00a84f] to-[#4dcb8b]",
  },
  lost: {
    label: "Verloren",
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-200",
    icon: "✕",
    gradient: "from-red-500 to-red-400",
  },
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
            <DealGroup
              title="Aktive Deals"
              count={activeDeals.length}
              deals={activeDeals}
              gradient="from-[#120774] to-[#4454b8]"
            />
          )}

          {/* Won Deals */}
          {wonDeals.length > 0 && (
            <DealGroup
              title="Gewonnene Deals"
              count={wonDeals.length}
              deals={wonDeals}
              gradient="from-[#00a84f] to-[#4dcb8b]"
            />
          )}

          {/* Lost Deals */}
          {lostDeals.length > 0 && (
            <DealGroup
              title="Verlorene Deals"
              count={lostDeals.length}
              deals={lostDeals}
              gradient="from-red-500 to-red-400"
            />
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

function DealGroup({
  title,
  count,
  deals,
  gradient,
}: {
  title: string;
  count: number;
  deals: any[];
  gradient: string;
}) {
  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}
        >
          <Briefcase size={18} className="text-white" strokeWidth={2.5} />
        </div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
          {title}
        </h3>
        <span className="text-xs font-bold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">
          {count}
        </span>
      </div>
      <div className="divide-y divide-slate-100">
        {deals.map((deal: any) => {
          const status = statusConfig[deal.status] ?? statusConfig.active;
          const contact = Array.isArray(deal.contacts)
            ? deal.contacts[0]
            : deal.contacts;
          const company = Array.isArray(deal.companies)
            ? deal.companies[0]
            : deal.companies;
          const stage = Array.isArray(deal.pipeline_stages)
            ? deal.pipeline_stages[0]
            : deal.pipeline_stages;

          return (
            <Link
              key={deal.id}
              href={`/deals/${deal.id}`}
              className="flex items-center gap-4 px-6 py-5 hover:bg-slate-50/80 transition-all group"
            >
              {/* Deal Icon */}
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${status.gradient} flex items-center justify-center shadow-md shrink-0 group-hover:shadow-lg transition-shadow`}
              >
                <Briefcase size={18} className="text-white" strokeWidth={2} />
              </div>

              {/* Deal Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-[#120774] transition-colors truncate">
                    {deal.title}
                  </p>
                  {stage?.name && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border border-[#4454b8]/20 bg-[#4454b8]/10 text-[#4454b8] shrink-0">
                      {stage.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1.5">
                  {company?.name && (
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Building2 size={12} className="text-slate-400" />
                      {company.name}
                    </span>
                  )}
                  {contact && (
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Users size={12} className="text-slate-400" />
                      {contact.first_name} {contact.last_name}
                    </span>
                  )}
                  {deal.expected_close_date && (
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar size={12} className="text-slate-400" />
                      {new Date(deal.expected_close_date).toLocaleDateString(
                        "de-DE"
                      )}
                    </span>
                  )}
                </div>
                {deal.next_action && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <ArrowRight size={11} className="text-[#4454b8] shrink-0" />
                    <span className="text-xs text-slate-600 font-medium truncate">
                      {deal.next_action}
                    </span>
                    {deal.next_action_date && (
                      <span className="text-[10px] text-slate-400 shrink-0">
                        bis{" "}
                        {new Date(deal.next_action_date).toLocaleDateString(
                          "de-DE"
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Value */}
              {deal.value != null && (
                <span className="text-base font-bold text-slate-900 shrink-0">
                  {fmt.format(deal.value)}
                </span>
              )}

              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border shrink-0 ${status.bg} ${status.text} ${status.border}`}
              >
                <span>{status.icon}</span>
                {status.label}
              </span>

              {/* Chevron */}
              <ChevronRight
                size={16}
                className="text-slate-300 group-hover:text-[#4454b8] transition-colors shrink-0"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
