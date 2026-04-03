import {
  getDashboardStats,
  getPipelineSummaries,
  getRecentActivities,
  getUpcomingActions,
} from "./actions";
import { PipelineSummaryCards } from "./pipeline-summary";
import { RecentActivities } from "./recent-activities";
import { UpcomingActions } from "./upcoming-actions";
import { Users, Building2, Kanban, Banknote, Handshake, ListTodo, AlertCircle, ArrowRightLeft } from "lucide-react";
import Link from "next/link";

const fmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export default async function DashboardPage() {
  const [stats, pipelines, activities, upcoming] = await Promise.all([
    getDashboardStats(),
    getPipelineSummaries(),
    getRecentActivities(15),
    getUpcomingActions(10),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Revenue & Relationship System — Übersicht
        </p>
      </div>

      {/* KPI Row 1 — Primary Metrics */}
      <div className="grid gap-5 md:grid-cols-4">
        <KPICard
          label="Kontakte"
          value={stats.totalContacts}
          icon={Users}
          href="/contacts"
          gradient="from-[#120774] to-[#4454b8]"
          glow="rgba(68, 84, 184, 0.15)"
        />
        <KPICard
          label="Firmen"
          value={stats.totalCompanies}
          icon={Building2}
          href="/companies"
          gradient="from-[#120774] to-[#4454b8]"
          glow="rgba(68, 84, 184, 0.15)"
        />
        <KPICard
          label="Multiplikatoren"
          value={stats.multiplierCount}
          icon={Handshake}
          href="/multiplikatoren"
          gradient="from-[#00a84f] to-[#4dcb8b]"
          glow="rgba(0, 168, 79, 0.15)"
        />
        <KPICard
          label="Pipeline-Wert"
          value={fmt.format(stats.totalPipelineValue)}
          icon={Banknote}
          href="/pipeline/unternehmer"
          gradient="from-[#00a84f] to-[#4dcb8b]"
          glow="rgba(0, 168, 79, 0.15)"
          large
        />
      </div>

      {/* KPI Row 2 — Operational Metrics */}
      <div className="grid gap-5 md:grid-cols-4">
        <KPICard
          label="Offene Deals"
          value={stats.openDeals}
          icon={Kanban}
          href="/pipeline/unternehmer"
          gradient="from-slate-500 to-slate-600"
          glow="rgba(100, 116, 139, 0.1)"
        />
        <KPICard
          label="Offene Aufgaben"
          value={stats.openTasks}
          icon={ListTodo}
          href="/aufgaben"
          gradient="from-[#f2b705] to-[#ffd54f]"
          glow="rgba(242, 183, 5, 0.15)"
        />
        <KPICard
          label="Überfällig"
          value={stats.overdueTasks}
          icon={AlertCircle}
          href="/aufgaben"
          gradient="from-red-500 to-red-400"
          glow="rgba(239, 68, 68, 0.15)"
          alert={stats.overdueTasks > 0}
        />
        <KPICard
          label="Offene Übergaben"
          value={stats.pendingHandoffs}
          icon={ArrowRightLeft}
          href="/handoffs"
          gradient="from-slate-500 to-slate-600"
          glow="rgba(100, 116, 139, 0.1)"
        />
      </div>

      {/* Pipeline Summaries */}
      <PipelineSummaryCards summaries={pipelines} />

      {/* Activity Feed + Upcoming Actions */}
      <div className="grid gap-5 md:grid-cols-2">
        <RecentActivities activities={activities} />
        <UpcomingActions actions={upcoming} />
      </div>
    </div>
  );
}

function KPICard({
  label,
  value,
  icon: Icon,
  href,
  gradient,
  glow,
  large,
  alert,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
  href: string;
  gradient: string;
  glow: string;
  large?: boolean;
  alert?: boolean;
}) {
  return (
    <Link href={href} className="group">
      <div
        className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-300 group-hover:-translate-y-1 ${
          alert ? "ring-2 ring-red-200" : ""
        }`}
        style={{
          boxShadow: `0 1px 3px rgb(0 0 0 / 0.1), 0 8px 20px -4px ${glow}`,
        }}
      >
        {/* Gradient accent */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{label}</p>
            <p
              className={`font-bold tabular-nums bg-gradient-to-r ${gradient} bg-clip-text ${
                large ? "text-3xl" : "text-2xl"
              }`}
              style={{ WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              {value}
            </p>
          </div>
          <div
            className={`rounded-xl bg-gradient-to-br ${gradient} p-2.5 text-white transition-transform duration-300 group-hover:scale-110`}
            style={{ boxShadow: `0 4px 12px ${glow}` }}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
