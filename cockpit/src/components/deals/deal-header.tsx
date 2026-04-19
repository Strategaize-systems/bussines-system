import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, User, Calendar, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { PipelineStage } from "@/app/(app)/pipeline/actions";

const fmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: string }
> = {
  active: {
    label: "Aktiv",
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-200",
    icon: "🔥",
  },
  won: {
    label: "Gewonnen",
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    border: "border-emerald-200",
    icon: "⭐",
  },
  lost: {
    label: "Verloren",
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-200",
    icon: "✕",
  },
};

interface DealHeaderProps {
  deal: any;
  stages: PipelineStage[];
}

export function DealHeader({ deal, stages }: DealHeaderProps) {
  const st = statusConfig[deal.status] ?? statusConfig.active;
  const stage = stages.find((s) => s.id === deal.stage_id);

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 shadow-lg relative overflow-hidden">
      {/* Top Accent Gradient */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#120774] to-[#4454b8]" />

      <div className="p-6">
        <div className="flex items-start gap-4">
          <Link href="/pipeline">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg hover:bg-slate-100 shrink-0 mt-0.5"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div className="flex-1 min-w-0">
            {/* Title Row */}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {deal.title}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${st.bg} ${st.text} ${st.border}`}
              >
                <span>{st.icon}</span>
                {st.label}
              </span>
              {stage && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border border-[#4454b8]/20 bg-[#4454b8]/10 text-[#4454b8]">
                  <TrendingUp className="h-3 w-3" />
                  {stage.name}
                  {stage.probability > 0 && ` · ${stage.probability}%`}
                </span>
              )}
            </div>

            {/* Value + Meta Row */}
            <div className="flex items-center gap-5 mt-3">
              {deal.value != null && (
                <span className="text-2xl font-bold text-slate-900">
                  {fmt.format(deal.value)}
                </span>
              )}
              <div className="flex items-center gap-4 text-sm text-slate-500">
                {deal.contacts && (
                  <Link
                    href={`/contacts/${deal.contacts.id}`}
                    className="flex items-center gap-1.5 hover:text-[#4454b8] transition-colors"
                  >
                    <User className="h-3.5 w-3.5" />
                    {deal.contacts.first_name} {deal.contacts.last_name}
                  </Link>
                )}
                {deal.companies && (
                  <Link
                    href={`/companies/${deal.companies.id}`}
                    className="flex items-center gap-1.5 hover:text-[#4454b8] transition-colors"
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    {deal.companies.name}
                  </Link>
                )}
                {deal.expected_close_date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Erw. Abschluss:{" "}
                    {new Date(deal.expected_close_date).toLocaleDateString(
                      "de-DE"
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
