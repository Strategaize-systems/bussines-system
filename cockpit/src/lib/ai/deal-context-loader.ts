// =============================================================
// V5.6 SLC-564 — Deal Briefing Context Loader (server-side)
// =============================================================
// Loads the DealBriefingContext for a given deal from the DB so the cron
// can call buildDealBriefingPrompt() without piggy-backing on a client
// request. Reuses DealBriefingContext from lib/ai/types so the FEAT-301
// prompt stays the single source of truth.
//
// Schema realities (verified against 01_schema.sql + 04_v2_migration.sql +
// 026_v55_proposal_creation.sql):
//   - deals has title (not name), value, status, expected_close_date,
//     stage_id, contact_id, company_id. No `notes`, no `probability`.
//   - pipeline_stages has probability — joined via stage_id.
//   - contacts uses position (not role) and joins companies via company_id.
//   - proposals uses title, total_gross, status, created_at, version.
//   - activities has type, title, description, created_at.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DealBriefingContext } from "@/lib/ai/types";

export async function loadDealBriefingContext(
  dealId: string,
  client: SupabaseClient
): Promise<DealBriefingContext | null> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const dealPromise = client
    .from("deals")
    .select(
      "id, title, value, status, expected_close_date, contact_id, pipeline_stages(name, probability)"
    )
    .eq("id", dealId)
    .single();

  const activitiesPromise = client
    .from("activities")
    .select("type, title, description, created_at")
    .eq("deal_id", dealId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(10);

  const proposalsPromise = client
    .from("proposals")
    .select("title, total_gross, status, created_at, version")
    .eq("deal_id", dealId)
    .order("version", { ascending: false })
    .limit(10);

  const [dealRes, activitiesRes, proposalsRes] = await Promise.all([
    dealPromise,
    activitiesPromise,
    proposalsPromise,
  ]);

  if (dealRes.error || !dealRes.data) return null;

  const deal = dealRes.data as {
    id: string;
    title: string | null;
    value: number | null;
    status: string | null;
    expected_close_date: string | null;
    contact_id: string | null;
    pipeline_stages:
      | { name?: string | null; probability?: number | null }
      | { name?: string | null; probability?: number | null }[]
      | null;
  };

  const stage = Array.isArray(deal.pipeline_stages)
    ? deal.pipeline_stages[0]
    : deal.pipeline_stages;

  // Single primary contact via deals.contact_id (no join table in current schema).
  let contacts: DealBriefingContext["contacts"];
  if (deal.contact_id) {
    const { data: contactRow } = await client
      .from("contacts")
      .select("first_name, last_name, position, companies(name)")
      .eq("id", deal.contact_id)
      .maybeSingle();

    if (contactRow) {
      const company = Array.isArray(contactRow.companies)
        ? contactRow.companies[0]?.name
        : (contactRow.companies as { name?: string } | null)?.name;
      const name = `${contactRow.first_name ?? ""} ${contactRow.last_name ?? ""}`.trim();
      if (name) {
        contacts = [
          {
            name,
            role: contactRow.position ?? undefined,
            company: company ?? undefined,
          },
        ];
      }
    }
  }

  const activities = (activitiesRes.data ?? []).map((a) => ({
    type: a.type ?? "note",
    subject: a.title ?? a.type ?? "Aktivitaet",
    date: a.created_at?.slice(0, 10) ?? "",
    notes: a.description ?? undefined,
  }));

  const proposals = (proposalsRes.data ?? []).map((p) => ({
    title: p.title ?? "Angebot",
    value: typeof p.total_gross === "number" ? p.total_gross : undefined,
    status: p.status ?? undefined,
    date: p.created_at?.slice(0, 10) ?? undefined,
  }));

  return {
    deal: {
      id: deal.id,
      name: deal.title ?? "Unbenannter Deal",
      value: typeof deal.value === "number" ? deal.value : undefined,
      stage: stage?.name ?? undefined,
      probability:
        typeof stage?.probability === "number" ? stage.probability : undefined,
      expectedCloseDate: deal.expected_close_date ?? undefined,
    },
    contacts,
    activities: activities.length > 0 ? activities : undefined,
    proposals: proposals.length > 0 ? proposals : undefined,
  };
}
