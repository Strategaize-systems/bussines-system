import {
  getDashboardStats,
  getPipelineSummaries,
  getRecentActivities,
  getUpcomingActions,
} from "./actions";
import { PipelineSummaryCards } from "./pipeline-summary";
import { RecentActivities } from "./recent-activities";
import { UpcomingActions } from "./upcoming-actions";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm font-medium text-muted-foreground">
          Revenue & Relationship System
        </p>
      </div>

      {/* Stats Row 1 */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Kontakte"
          value={stats.totalContacts}
          icon={Users}
          href="/contacts"
          accent="primary"
        />
        <StatCard
          label="Firmen"
          value={stats.totalCompanies}
          icon={Building2}
          href="/companies"
          accent="primary"
        />
        <StatCard
          label="Multiplikatoren"
          value={stats.multiplierCount}
          icon={Handshake}
          href="/multiplikatoren"
          accent="success"
        />
        <StatCard
          label="Pipeline-Wert"
          value={fmt.format(stats.totalPipelineValue)}
          icon={Banknote}
          href="/pipeline/unternehmer"
          accent="success"
        />
      </div>

      {/* Stats Row 2 */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Offene Deals"
          value={stats.openDeals}
          icon={Kanban}
          href="/pipeline/unternehmer"
        />
        <StatCard
          label="Offene Aufgaben"
          value={stats.openTasks}
          icon={ListTodo}
          href="/aufgaben"
          accent="warning"
        />
        <StatCard
          label="Überfällige Aufgaben"
          value={stats.overdueTasks}
          icon={AlertCircle}
          href="/aufgaben"
          accent="danger"
        />
        <StatCard
          label="Offene Übergaben"
          value={stats.pendingHandoffs}
          icon={ArrowRightLeft}
          href="/handoffs"
        />
      </div>

      {/* Pipeline Summaries */}
      <PipelineSummaryCards summaries={pipelines} />

      {/* Activity Feed + Upcoming Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <RecentActivities activities={activities} />
        <UpcomingActions actions={upcoming} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  accent,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
  href: string;
  accent?: "primary" | "success" | "warning" | "danger";
}) {
  const accentColors = {
    primary: "from-[#120774] to-[#4454b8]",
    success: "from-[#00a84f] to-[#4dcb8b]",
    warning: "from-[#f2b705] to-[#ffd54f]",
    danger: "from-red-500 to-red-400",
  };
  const iconColors = {
    primary: "text-[#4454b8]",
    success: "text-[#00a84f]",
    warning: "text-[#f2b705]",
    danger: "text-red-500",
  };

  return (
    <Link href={href}>
      <Card className="relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
        {accent && (
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accentColors[accent]}`} />
        )}
        <CardContent className="flex items-center gap-4 p-5">
          <div className={`rounded-lg bg-slate-50 p-2.5 ${accent ? iconColors[accent] : "text-muted-foreground"}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
