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
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Business Cockpit — Übersicht
        </p>
      </div>

      {/* Stats Row 1 */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Kontakte"
          value={stats.totalContacts}
          icon={Users}
          href="/contacts"
        />
        <StatCard
          label="Firmen"
          value={stats.totalCompanies}
          icon={Building2}
          href="/companies"
        />
        <StatCard
          label="Multiplikatoren"
          value={stats.multiplierCount}
          icon={Handshake}
          href="/multiplikatoren"
        />
        <StatCard
          label="Pipeline-Wert"
          value={fmt.format(stats.totalPipelineValue)}
          icon={Banknote}
          href="/pipeline/unternehmer"
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
        />
        <StatCard
          label="Überfällige Aufgaben"
          value={stats.overdueTasks}
          icon={AlertCircle}
          href="/aufgaben"
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
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:bg-muted/50 transition-colors">
        <CardContent className="flex items-center gap-4 p-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
