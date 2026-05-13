// SLC-705 MT-2/3/5 — Team-KPI-Header (Server-Component, pure render)
//
// 4-Card KPI-Strip: Pipeline-Sum, Offene Aktivitaeten, Conversion 30T,
// Backlog-Mitarbeiter. Formatierung in deutschem Locale; Backlog-Card
// faerbt rot wenn >0 Member im Backlog.

import { Briefcase, CheckSquare, TrendingUp, Users } from "lucide-react";
import { KPICard, KPIGrid } from "@/components/ui/kpi-card";
import type { TeamKPIs } from "@/lib/team/aggregate-queries";

const euroFmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const pctFmt = new Intl.NumberFormat("de-DE", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

interface Props {
  kpis: TeamKPIs;
}

export function TeamKpiHeader({ kpis }: Props) {
  // Conversion: 0 (kein won + kein lost in 30T) -> "—" statt "0,0 %"
  const conversionLabel =
    kpis.conversionRate30d === 0 ? "—" : pctFmt.format(kpis.conversionRate30d);

  return (
    <KPIGrid columns={4}>
      <KPICard
        label="Pipeline-Sum"
        value={euroFmt.format(kpis.pipelineSum)}
        icon={Briefcase}
        gradient="blue"
      />
      <KPICard
        label="Offene Aktivitaeten"
        value={kpis.openActivitiesCount}
        icon={CheckSquare}
        gradient="yellow"
      />
      <KPICard
        label="Conversion 30T"
        value={conversionLabel}
        icon={TrendingUp}
        gradient="emerald"
      />
      <KPICard
        label="Backlog-Mitarbeiter"
        value={kpis.backlogMemberCount}
        icon={Users}
        gradient={kpis.backlogMemberCount > 0 ? "red" : "green"}
      />
    </KPIGrid>
  );
}
