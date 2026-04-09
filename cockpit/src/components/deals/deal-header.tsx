import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, User, Calendar } from "lucide-react";
import Link from "next/link";
import type { PipelineStage } from "@/app/(app)/pipeline/actions";

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

interface DealHeaderProps {
  deal: any;
  stages: PipelineStage[];
}

export function DealHeader({ deal, stages }: DealHeaderProps) {
  const st = statusConfig[deal.status] ?? statusConfig.active;
  const stage = stages.find((s) => s.id === deal.stage_id);

  return (
    <div className="flex items-center gap-4">
      <Link href="/pipeline">
        <Button variant="ghost" size="icon">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </Link>
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {deal.title}
          </h1>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.color}`}
          >
            {st.label}
          </span>
          {stage && (
            <Badge variant="outline" className="text-xs">
              {stage.name}
              {stage.probability > 0 && ` · ${stage.probability}%`}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
          {deal.value != null && (
            <span className="font-semibold text-slate-700">
              {fmt.format(deal.value)}
            </span>
          )}
          {deal.contacts && (
            <Link
              href={`/contacts/${deal.contacts.id}`}
              className="flex items-center gap-1 hover:text-slate-700 hover:underline"
            >
              <User className="h-3.5 w-3.5" />
              {deal.contacts.first_name} {deal.contacts.last_name}
            </Link>
          )}
          {deal.companies && (
            <Link
              href={`/companies/${deal.companies.id}`}
              className="flex items-center gap-1 hover:text-slate-700 hover:underline"
            >
              <Building2 className="h-3.5 w-3.5" />
              {deal.companies.name}
            </Link>
          )}
          {deal.expected_close_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Erw. Abschluss:{" "}
              {new Date(deal.expected_close_date).toLocaleDateString("de-DE")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
