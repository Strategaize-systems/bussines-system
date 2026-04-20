import { createAdminClient } from "@/lib/supabase/admin";
import type { ActivityKpiKey } from "@/types/activity-kpis";

type AdminClient = ReturnType<typeof createAdminClient>;

function todayRange(): { start: string; end: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  return {
    start: today.toISOString(),
    end: tomorrow.toISOString(),
  };
}

function weekRange(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);

  return {
    start: monday.toISOString(),
    end: nextMonday.toISOString(),
  };
}

// ── Calls (activities WHERE type includes 'call' or 'anruf') ──

async function countCalls(admin: AdminClient, start: string, end: string): Promise<number> {
  // Activities with type containing 'call' or conversation_type
  const { count } = await admin
    .from("activities")
    .select("id", { count: "exact", head: true })
    .or("type.eq.call,type.eq.anruf,conversation_type.eq.call,conversation_type.eq.anruf")
    .gte("created_at", start)
    .lt("created_at", end);

  return count ?? 0;
}

// ── Meetings (meetings table, not cancelled) ──────────────────

async function countMeetings(admin: AdminClient, start: string, end: string): Promise<number> {
  const { count } = await admin
    .from("meetings")
    .select("id", { count: "exact", head: true })
    .neq("status", "cancelled")
    .gte("date", start)
    .lt("date", end);

  return count ?? 0;
}

// ── Deals moved (stage changes today via activities) ──────────

async function countDealsMoved(admin: AdminClient, start: string, end: string): Promise<number> {
  // Activities with type='stage_change' indicate a deal moved forward
  const { count } = await admin
    .from("activities")
    .select("id", { count: "exact", head: true })
    .eq("type", "stage_change")
    .gte("created_at", start)
    .lt("created_at", end);

  return count ?? 0;
}

// ── Deals created ─────────────────────────────────────────────

async function countDealsCreated(admin: AdminClient, start: string, end: string): Promise<number> {
  const { count } = await admin
    .from("deals")
    .select("id", { count: "exact", head: true })
    .gte("created_at", start)
    .lt("created_at", end);

  return count ?? 0;
}

// ── Deals stagnant (active deals without activity for >7 days) ─

async function countDealsStagnant(admin: AdminClient): Promise<number> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString();

  // Active deals where updated_at is older than 7 days
  const { count } = await admin
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .lt("updated_at", cutoff);

  return count ?? 0;
}

// ── Public API ────────────────────────────────────────────────

export async function getActivityKpiActual(
  admin: AdminClient,
  kpiKey: ActivityKpiKey,
  period: "today" | "week",
): Promise<number> {
  const range = period === "today" ? todayRange() : weekRange();

  switch (kpiKey) {
    case "calls":
      return countCalls(admin, range.start, range.end);
    case "meetings":
      return countMeetings(admin, range.start, range.end);
    case "deals_moved":
      return countDealsMoved(admin, range.start, range.end);
    case "deals_created":
      return countDealsCreated(admin, range.start, range.end);
    case "deals_stagnant":
      return countDealsStagnant(admin);
    default:
      return 0;
  }
}
