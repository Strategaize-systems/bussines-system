// SLC-705 MT-1 — Team-Aggregat-Query-Layer
//
// Drei async Server-only Functions fuer das V7 Team-Aggregat-Cockpit:
//   - getTeamKPIs(supabase)            -> 4 Header-KPIs
//   - getTeamMembers(supabase)         -> Pro-Mitarbeiter-Aggregat (5 Felder)
//   - getTeamBedrockContext(supabase)  -> Flat Snapshot fuer Bedrock-Prompts
//
// RLS-Implicit-Filtering (MIG-035):
//   Alle SELECTs auf companies/contacts/deals/activities/meetings/proposals/
//   email_messages/calls laufen durch die can_see_owner(owner_user_id)-Policy.
//   - Admin-Session  -> sieht alles
//   - Teamlead-Session -> sieht nur das eigene Team (via get_my_team_id())
//   - Member-Session -> sieht nur eigene Records
//   Es ist daher KEIN expliziter team_id-Filter im SQL noetig.
//   Ausnahme: profiles hat eine permissive "all-read"-Policy — dort filtern wir
//   explizit auf team_id der aufrufenden User-Identitaet, sonst sehen wir alle
//   Profiles aller Teams in `getTeamMembers`.
//
// Spec-Drift-Fix:
//   Das SLC-705 Slice-Dokument referenziert `deals.status = 'open'` und
//   `deals.total_gross`. Die reale Schema-Wahrheit (siehe sql/01_schema.sql
//   und sql/migrations/019_v5_schema.sql Kontext + cockpit/src/lib/goals/
//   kpi-queries.ts) ist:
//     - Spalte heisst `deals.value` (NUMERIC), nicht `total_gross`
//     - Status fuer offene Deals heisst `'active'`, nicht `'open'`
//   Wir nutzen `value` + `status='active'` konsistent mit dem bestehenden
//   KPI-Code (lib/goals/kpi-queries.ts).
//
// Weitere Schema-Praezisierung fuer `activities`:
//   activities hat KEINE `status`-Spalte und KEINE `due_at`-Spalte. Stattdessen:
//     - "offen" = completed_at IS NULL
//     - "due"   = due_date (TIMESTAMPTZ)
//   "Open Activities" und "Overdue" werden entsprechend daraus abgeleitet.

import type { SupabaseClient } from "@supabase/supabase-js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface TeamKPIs {
  pipelineSum: number;
  openActivitiesCount: number;
  conversionRate30d: number;
  backlogMemberCount: number;
}

export interface TeamMemberAggregate {
  user_id: string;
  display_name: string;
  role: string;
  pipeline_sum: number;
  open_deals: number;
  open_activities: number;
  last_login_at: string | null;
  overdue_count: number;
}

export interface TeamBedrockContext {
  generatedAt: string;
  members: Array<{
    user_id: string;
    display_name: string;
    role: string;
    pipeline_sum: number;
    open_deals: number;
    open_activities: number;
    overdue_count: number;
    last_login_at: string | null;
  }>;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Liefert das tomorrow-midnight (UTC) — vereinfachende Implementierung.
 * Hinweis: timezone-naive, basiert auf UTC. Sollte ein Cockpit-Cutoff
 * tageszeit-genau in lokaler User-Zeitzone benoetigt werden, ist das ein
 * Frontend-Filter, kein Backend-Filter.
 */
function tomorrowMidnightUtcIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

function nowIso(): string {
  return new Date().toISOString();
}

function thirtyDaysAgoIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 30);
  return d.toISOString();
}

// ── Public Queries ──────────────────────────────────────────────────────────

/**
 * Team-weite Header-KPIs. Alle 4 Counts/Sums laufen parallel.
 * RLS sorgt fuer Sichtbarkeits-Filterung — kein expliziter team_id-Filter.
 */
export async function getTeamKPIs(supabase: SupabaseClient): Promise<TeamKPIs> {
  const tomorrowMidnight = tomorrowMidnightUtcIso();
  const thirtyDaysAgo = thirtyDaysAgoIso();

  const [
    activeDealsResult,
    openActivitiesResult,
    wonDealsResult,
    lostDealsResult,
    overdueActivitiesResult,
  ] = await Promise.all([
    // pipelineSum: SUM(deals.value) WHERE status='active'
    supabase.from("deals").select("value, owner_user_id").eq("status", "active"),
    // openActivitiesCount: COUNT(activities) WHERE completed_at IS NULL AND due_date < tomorrow_midnight
    supabase
      .from("activities")
      .select("id", { count: "exact", head: true })
      .is("completed_at", null)
      .lt("due_date", tomorrowMidnight),
    // wonDeals (30d)
    supabase
      .from("deals")
      .select("id", { count: "exact", head: true })
      .eq("status", "won")
      .gte("updated_at", thirtyDaysAgo),
    // lostDeals (30d)
    supabase
      .from("deals")
      .select("id", { count: "exact", head: true })
      .eq("status", "lost")
      .gte("updated_at", thirtyDaysAgo),
    // Activities die offen + ueberfaellig sind — als Basis fuer backlogMemberCount
    supabase
      .from("activities")
      .select("owner_user_id")
      .is("completed_at", null)
      .lt("due_date", nowIso()),
  ]);

  // pipelineSum — defensive: leere Liste -> 0
  const pipelineSum = (activeDealsResult.data ?? []).reduce(
    (sum: number, d: { value: number | string | null }) =>
      sum + (Number(d.value) || 0),
    0,
  );

  const openActivitiesCount = openActivitiesResult.count ?? 0;

  // conversionRate30d — 0 wenn Nenner=0
  const won = wonDealsResult.count ?? 0;
  const lost = lostDealsResult.count ?? 0;
  const denom = won + lost;
  const conversionRate30d = denom > 0 ? won / denom : 0;

  // backlogMemberCount = #distinct owner mit mind. einer ueberfaelligen offenen Activity
  const overdueOwners = new Set<string>();
  for (const row of overdueActivitiesResult.data ?? []) {
    const owner = (row as { owner_user_id: string | null }).owner_user_id;
    if (owner) overdueOwners.add(owner);
  }
  const backlogMemberCount = overdueOwners.size;

  return {
    pipelineSum,
    openActivitiesCount,
    conversionRate30d,
    backlogMemberCount,
  };
}

/**
 * Liste der Team-Mitarbeiter aus Sicht des aufrufenden Teamlead/Admin —
 * exklusive sich selbst. Die Mitgliedertabelle auf /team zeigt die zu
 * beobachtenden Mitarbeiter, nicht den Teamlead selbst.
 *
 * profiles hat eine permissive Read-Policy (alle-lesen). Daher filtern wir
 * hier explizit auf team_id der aufrufenden User-Identitaet, sonst wuerden
 * Profiles fremder Teams in der Liste erscheinen.
 *
 * Admin-Use-Case: ein Admin ohne team_id sieht im V7-Start ALLE Profiles
 * ausser sich selbst (Multi-Team-Cockpit-Anzeige kommt erst spaeter, vgl.
 * FEAT-503). Filter "id != caller.id" greift trotzdem.
 */
export async function getTeamMembers(
  supabase: SupabaseClient,
): Promise<TeamMemberAggregate[]> {
  // Schritt 1: caller-Profile fuer team_id + id-Self-Filter laden.
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("id, team_id")
    .single();

  const caller = callerProfile as { id: string; team_id: string | null } | null;
  const callerTeamId = caller?.team_id ?? null;
  const callerId = caller?.id ?? null;

  let profilesQuery = supabase
    .from("profiles")
    .select("id, display_name, role, last_login_at, team_id");

  if (callerTeamId) {
    profilesQuery = profilesQuery.eq("team_id", callerTeamId);
  }
  if (callerId) {
    profilesQuery = profilesQuery.neq("id", callerId);
  }

  const { data: profiles } = await profilesQuery;

  type ProfileRow = {
    id: string;
    display_name: string | null;
    role: string;
    last_login_at: string | null;
    team_id: string | null;
  };

  const profileRows = (profiles ?? []) as ProfileRow[];
  if (profileRows.length === 0) return [];

  const memberIds = profileRows.map((p) => p.id);

  // Schritt 2: aggregat-relevante deals + activities einlesen, RLS-gefiltert.
  // Wir greifen .in() Filter auf owner_user_id zu, um nur unsere Member zu
  // ziehen. Bei sehr grossen Teams (>500 Members) waere ein Server-Side
  // AGGREGATE per RPC sinnvoll — fuer V7 (<= 50 Members) reicht IN().
  const nowMs = nowIso();
  const [activeDealsResult, openActivitiesResult, overdueActivitiesResult] =
    await Promise.all([
      supabase
        .from("deals")
        .select("owner_user_id, value")
        .eq("status", "active")
        .in("owner_user_id", memberIds),
      supabase
        .from("activities")
        .select("owner_user_id")
        .is("completed_at", null)
        .in("owner_user_id", memberIds),
      supabase
        .from("activities")
        .select("owner_user_id")
        .is("completed_at", null)
        .lt("due_date", nowMs)
        .in("owner_user_id", memberIds),
    ]);

  // Aggregat-Maps aufbauen
  const pipelineSumByOwner = new Map<string, number>();
  const openDealsCountByOwner = new Map<string, number>();
  for (const row of activeDealsResult.data ?? []) {
    const r = row as { owner_user_id: string | null; value: number | string | null };
    if (!r.owner_user_id) continue;
    pipelineSumByOwner.set(
      r.owner_user_id,
      (pipelineSumByOwner.get(r.owner_user_id) ?? 0) + (Number(r.value) || 0),
    );
    openDealsCountByOwner.set(
      r.owner_user_id,
      (openDealsCountByOwner.get(r.owner_user_id) ?? 0) + 1,
    );
  }

  const openActivitiesByOwner = new Map<string, number>();
  for (const row of openActivitiesResult.data ?? []) {
    const owner = (row as { owner_user_id: string | null }).owner_user_id;
    if (!owner) continue;
    openActivitiesByOwner.set(owner, (openActivitiesByOwner.get(owner) ?? 0) + 1);
  }

  const overdueByOwner = new Map<string, number>();
  for (const row of overdueActivitiesResult.data ?? []) {
    const owner = (row as { owner_user_id: string | null }).owner_user_id;
    if (!owner) continue;
    overdueByOwner.set(owner, (overdueByOwner.get(owner) ?? 0) + 1);
  }

  return profileRows.map((p) => ({
    user_id: p.id,
    display_name: p.display_name ?? "",
    role: p.role,
    pipeline_sum: pipelineSumByOwner.get(p.id) ?? 0,
    open_deals: openDealsCountByOwner.get(p.id) ?? 0,
    open_activities: openActivitiesByOwner.get(p.id) ?? 0,
    last_login_at: p.last_login_at,
    overdue_count: overdueByOwner.get(p.id) ?? 0,
  }));
}

/**
 * Flat Snapshot fuer Bedrock-Prompts. Komprimiert die Member-Liste auf die
 * Felder, die das LLM fuer Coaching-Vorschlaege braucht. Bewusst KEIN
 * "free-form notes"-Feld — Prompt bleibt klein und stabil.
 */
export async function getTeamBedrockContext(
  supabase: SupabaseClient,
): Promise<TeamBedrockContext> {
  const members = await getTeamMembers(supabase);
  return {
    generatedAt: nowIso(),
    members: members.map((m) => ({
      user_id: m.user_id,
      display_name: m.display_name,
      role: m.role,
      pipeline_sum: m.pipeline_sum,
      open_deals: m.open_deals,
      open_activities: m.open_activities,
      overdue_count: m.overdue_count,
      last_login_at: m.last_login_at,
    })),
  };
}
