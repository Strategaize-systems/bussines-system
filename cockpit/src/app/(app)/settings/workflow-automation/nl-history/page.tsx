// SLC-756 MT-1 — Admin-only Inspection-Log fuer NL-Workflow-Sculptor.
// Pattern-Reuse: assertRole aus V7.1 SLC-711 + createAdminClient aus
// V7 SLC-702 + listNlSculptHistory aus SLC-752 MT-8. User-Email-Map
// 1:1 aus settings/team/page.tsx Team-Verwaltung uebernommen.

import { assertRole } from "@/lib/auth/assert-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { listNlSculptHistory, type NlSculptHistoryRow } from "@/lib/automation/nl-history";
import { PageHeader } from "@/components/ui/page-header";
import { NlHistoryTable } from "@/components/settings/nl-history-table";

export const dynamic = "force-dynamic";

export interface EnrichedNlHistoryRow extends NlSculptHistoryRow {
  actor_email: string;
}

export default async function NlHistoryPage() {
  await assertRole(["admin"]);

  const admin = createAdminClient();

  const rows = await listNlSculptHistory(admin, { limit: 50 });

  const actorIds = [...new Set(rows.map((r) => r.actor_id))];
  const userById = new Map<string, string>();

  if (actorIds.length > 0) {
    const usersRes = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of usersRes.data?.users ?? []) {
      if (actorIds.includes(u.id)) {
        userById.set(u.id, u.email ?? `User ${u.id.slice(0, 8)}`);
      }
    }
  }

  const enrichedRows: EnrichedNlHistoryRow[] = rows.map((r) => ({
    ...r,
    actor_email: userById.get(r.actor_id) ?? `User ${r.actor_id.slice(0, 8)}`,
  }));

  return (
    <>
      <PageHeader
        title="NL-Workflow-Sculptor — History"
        subtitle="Letzte 50 NL-Sculpt-Versuche (Admin-Inspection)"
      />
      <main className="px-8 py-8 space-y-6">
        <NlHistoryTable rows={enrichedRows} />
      </main>
    </>
  );
}
