// SLC-705 MT-2/3/4/5 — V7 Team-Aggregat-Cockpit (Page-Shell)
//
// Server-Component-Entry-Point fuer /team. Laedt KPIs + Mitarbeiterliste
// ueber den von SA-1 bereitgestellten Aggregat-Query-Layer und rendert
// PageHeader + KPI-Header + KI-Workspace (SA-3, MT-4) + Members-Tabelle.
//
// Role-Guard: assertRole(['admin','teamlead']) — Member -> redirect /mein-tag

import { assertRole } from "@/lib/auth/assert-role";
import { createClient } from "@/lib/supabase/server";
import { getTeamKPIs, getTeamMembers } from "@/lib/team/aggregate-queries";
import { PageHeader } from "@/components/ui/page-header";
import { TeamKpiHeader } from "./team-kpi-header";
import { TeamMembersAggregatTable } from "./team-members-aggregat-table";
import { TeamKiWorkspace } from "./team-ki-workspace";

export const dynamic = "force-dynamic";

export default async function TeamCockpitPage() {
  const profile = await assertRole(["admin", "teamlead"]);
  const supabase = await createClient();
  const [kpis, members] = await Promise.all([
    getTeamKPIs(supabase),
    getTeamMembers(supabase),
  ]);

  return (
    <>
      <PageHeader
        title="Team-Cockpit"
        subtitle="Team-Aggregat-KPIs, Mitarbeiter-Drilldown und KI-Coaching"
      />

      <main className="space-y-6 px-8 py-8">
        <TeamKpiHeader kpis={kpis} />

        <TeamKiWorkspace
          callerUserId={profile.user_id}
          callerTeamId={profile.team_id}
        />

        <TeamMembersAggregatTable members={members} />
      </main>
    </>
  );
}
