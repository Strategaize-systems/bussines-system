import { assertRole } from "@/lib/auth/assert-role";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Role } from "@/lib/auth/types";
import { PageHeader } from "@/components/ui/page-header";
import { Users } from "lucide-react";
import { TeamMembersTable } from "./team-members-table";
import { InviteDialog } from "./invite-dialog";

export const dynamic = "force-dynamic";

export interface TeamMemberRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: Role;
  team_id: string | null;
  last_sign_in_at: string | null;
  open_deals: number;
  open_activities: number;
}

interface TeamRow {
  id: string;
  name: string;
}

export default async function TeamSettingsPage() {
  const callerProfile = await assertRole(["admin", "teamlead"]);

  const admin = createAdminClient();

  // 1) Profiles (team-scope fuer Teamlead, alle fuer Admin).
  let profilesQuery = admin
    .from("profiles")
    .select("id, role, team_id, display_name")
    .order("display_name", { ascending: true });

  if (callerProfile.role === "teamlead" && callerProfile.team_id) {
    profilesQuery = profilesQuery.eq("team_id", callerProfile.team_id);
  }
  const profilesRes = await profilesQuery;
  const profileRows = (profilesRes.data ?? []) as Array<{
    id: string;
    role: Role;
    team_id: string | null;
    display_name: string | null;
  }>;

  const profileIds = new Set(profileRows.map((p) => p.id));

  // 2) Auth-Users (Mail + Last-Sign-In). listUsers ist paginiert; perPage 1000
  //   reicht fuer V7-Multi-User-Scale.
  const usersRes = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const userById = new Map<string, { email: string | null; last_sign_in_at: string | null }>();
  for (const u of usersRes.data?.users ?? []) {
    if (profileIds.has(u.id)) {
      userById.set(u.id, {
        email: u.email ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
      });
    }
  }

  // 3) Open-Deals: owner_user_id Bucket count.
  const openDealsRes = await admin
    .from("deals")
    .select("owner_user_id")
    .eq("status", "active");
  const openDealsByOwner = new Map<string, number>();
  for (const row of (openDealsRes.data ?? []) as Array<{ owner_user_id: string | null }>) {
    if (row.owner_user_id) {
      openDealsByOwner.set(
        row.owner_user_id,
        (openDealsByOwner.get(row.owner_user_id) ?? 0) + 1,
      );
    }
  }

  // 4) Open-Activities: completed_at IS NULL Bucket count.
  const openActivitiesRes = await admin
    .from("activities")
    .select("owner_user_id")
    .is("completed_at", null);
  const openActivitiesByOwner = new Map<string, number>();
  for (const row of (openActivitiesRes.data ?? []) as Array<{ owner_user_id: string | null }>) {
    if (row.owner_user_id) {
      openActivitiesByOwner.set(
        row.owner_user_id,
        (openActivitiesByOwner.get(row.owner_user_id) ?? 0) + 1,
      );
    }
  }

  // 5) Teams-Liste fuer Invite-Dropdown (Admin sieht alle, Teamlead pre-selected).
  const teamsRes = await admin.from("teams").select("id, name").order("name");
  const teams = ((teamsRes.data ?? []) as TeamRow[]).map((t) => ({
    id: t.id,
    name: t.name,
  }));

  const rows: TeamMemberRow[] = profileRows.map((p) => {
    const u = userById.get(p.id);
    return {
      user_id: p.id,
      email: u?.email ?? null,
      display_name: p.display_name,
      role: p.role,
      team_id: p.team_id,
      last_sign_in_at: u?.last_sign_in_at ?? null,
      open_deals: openDealsByOwner.get(p.id) ?? 0,
      open_activities: openActivitiesByOwner.get(p.id) ?? 0,
    };
  });

  const totalMembers = rows.length;
  const totalOpenDeals = rows.reduce((s, r) => s + r.open_deals, 0);
  const totalOpenActivities = rows.reduce((s, r) => s + r.open_activities, 0);

  const callerIsAdmin = callerProfile.role === "admin";

  return (
    <>
      <PageHeader
        title="Team-Verwaltung"
        subtitle={
          callerIsAdmin
            ? "Alle Teams + Mitglieder einsehen und verwalten"
            : "Mitglieder des eigenen Teams einsehen und einladen"
        }
      >
        <InviteDialog
          callerRole={callerProfile.role}
          callerTeamId={callerProfile.team_id}
          teams={teams}
        />
      </PageHeader>

      <main className="px-8 py-8 space-y-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <KpiCard
            label="Mitglieder"
            value={totalMembers}
            icon={<Users className="h-5 w-5" />}
          />
          <KpiCard label="Offene Deals" value={totalOpenDeals} />
          <KpiCard label="Offene Aufgaben" value={totalOpenActivities} />
        </section>

        <section>
          <TeamMembersTable
            rows={rows}
            callerIsAdmin={callerIsAdmin}
            callerUserId={callerProfile.user_id}
          />
        </section>
      </main>
    </>
  );
}

function KpiCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-slate-600">{label}</div>
          <div className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </div>
        </div>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
    </div>
  );
}
