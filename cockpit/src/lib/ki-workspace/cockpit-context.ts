// SLC-666 — Shared Context-Loader fuer die 6 Cockpit-Berichte.
// Eine Query-Schicht, mehrere Bedrock-Prompts. Verhindert N+1-DB-Calls.

import { createClient } from "@/lib/supabase/server";

export interface CockpitDeal {
  id: string;
  title: string;
  value: number | null;
  status: string;
  pipeline_id: string | null;
  pipeline_name: string | null;
  stage_id: string | null;
  stage_name: string | null;
  probability: number;
  company_name: string | null;
  updated_at: string;
  last_activity_at: string | null;
  next_action: string | null;
  next_action_date: string | null;
  won_lost_reason: string | null;
}

export interface CockpitPipeline {
  id: string;
  name: string;
}

export interface CockpitContext {
  generatedAt: string;
  pipelines: CockpitPipeline[];
  deals: CockpitDeal[];
}

type RawDealRow = {
  id: string;
  title: string;
  value: number | null;
  status: string;
  pipeline_id: string | null;
  stage_id: string | null;
  updated_at: string;
  next_action: string | null;
  next_action_date: string | null;
  won_lost_reason: string | null;
  companies: { name: string } | { name: string }[] | null;
  pipelines: { name: string } | { name: string }[] | null;
  pipeline_stages: { name: string; probability: number } | { name: string; probability: number }[] | null;
};

function flat<T>(x: T | T[] | null | undefined): T | null {
  if (!x) return null;
  return Array.isArray(x) ? (x[0] ?? null) : x;
}

/**
 * Lädt 1× alle aktiven + last-90d won/lost Deals + Pipeline-Liste + Last-Activity.
 * Die 6 Cockpit-Reports konsumieren je nur was sie brauchen.
 */
export async function loadCockpitContext(): Promise<CockpitContext> {
  const supabase = await createClient();
  const ninetyDaysAgoIso = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [pipelinesRes, dealsRes, lastActivityRes] = await Promise.all([
    supabase.from("pipelines").select("id, name").order("sort_order"),
    supabase
      .from("deals")
      .select(
        "id, title, value, status, pipeline_id, stage_id, updated_at, next_action, next_action_date, won_lost_reason, companies(name), pipelines(name), pipeline_stages(name, probability)",
      )
      .or(`status.eq.active,and(status.in.(won,lost),updated_at.gte.${ninetyDaysAgoIso})`)
      .order("updated_at", { ascending: false })
      .limit(500),
    supabase
      .from("activities")
      .select("deal_id, created_at")
      .not("deal_id", "is", null)
      .gte("created_at", ninetyDaysAgoIso)
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);

  if (pipelinesRes.error) throw new Error(pipelinesRes.error.message);
  if (dealsRes.error) throw new Error(dealsRes.error.message);

  const lastActivityByDeal = new Map<string, string>();
  for (const a of lastActivityRes.data ?? []) {
    const row = a as { deal_id: string | null; created_at: string };
    if (row.deal_id && !lastActivityByDeal.has(row.deal_id)) {
      lastActivityByDeal.set(row.deal_id, row.created_at);
    }
  }

  const deals: CockpitDeal[] = ((dealsRes.data ?? []) as RawDealRow[]).map((row) => {
    const company = flat(row.companies);
    const pipeline = flat(row.pipelines);
    const stage = flat(row.pipeline_stages);
    return {
      id: row.id,
      title: row.title,
      value: row.value,
      status: row.status,
      pipeline_id: row.pipeline_id,
      pipeline_name: pipeline?.name ?? null,
      stage_id: row.stage_id,
      stage_name: stage?.name ?? null,
      probability: stage?.probability ?? 0,
      company_name: company?.name ?? null,
      updated_at: row.updated_at,
      last_activity_at: lastActivityByDeal.get(row.id) ?? null,
      next_action: row.next_action,
      next_action_date: row.next_action_date,
      won_lost_reason: row.won_lost_reason,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    pipelines: (pipelinesRes.data ?? []) as CockpitPipeline[],
    deals,
  };
}
