import { createClient } from "@/lib/supabase/server";

export type DealCardData = {
  id: string;
  title: string;
  value: number | null;
  status: string;
  pipeline_id: string | null;
  stage_id: string | null;
  stage_name: string | null;
  stage_color: string | null;
  probability: number;
  company_name: string | null;
  next_action_title: string | null;
  next_action_date: string | null;
  weighted_value: number;
  updated_at: string;
};

type RawDealRow = {
  id: string;
  title: string;
  value: number | null;
  status: string;
  pipeline_id: string | null;
  stage_id: string | null;
  next_action: string | null;
  next_action_date: string | null;
  updated_at: string;
  companies: { name: string } | { name: string }[] | null;
  pipeline_stages: { name: string; color: string | null; probability: number } | { name: string; color: string | null; probability: number }[] | null;
};

function flatten<T>(x: T | T[] | null | undefined): T | null {
  if (!x) return null;
  return Array.isArray(x) ? (x[0] ?? null) : x;
}

export function mapRawDealToCard(raw: RawDealRow): DealCardData {
  const company = flatten(raw.companies);
  const stage = flatten(raw.pipeline_stages);
  const probability = stage?.probability ?? 0;
  const value = raw.value ?? 0;
  return {
    id: raw.id,
    title: raw.title,
    value: raw.value,
    status: raw.status,
    pipeline_id: raw.pipeline_id,
    stage_id: raw.stage_id,
    stage_name: stage?.name ?? null,
    stage_color: stage?.color ?? null,
    probability,
    company_name: company?.name ?? null,
    next_action_title: raw.next_action,
    next_action_date: raw.next_action_date,
    weighted_value: value * probability,
    updated_at: raw.updated_at,
  };
}

/**
 * Pure-Function: Sortiert Deals nach (value * probability) absteigend.
 * Erlaubt Vitest ohne DB.
 */
export function sortDealsByWeightedValue(deals: DealCardData[]): DealCardData[] {
  return [...deals].sort((a, b) => b.weighted_value - a.weighted_value);
}

/**
 * Pure-Function: Limitiert auf Top-N und filtert status='active'.
 */
export function selectTopActiveDeals(
  deals: DealCardData[],
  limit: number,
): DealCardData[] {
  const active = deals.filter((d) => d.status === "active");
  return sortDealsByWeightedValue(active).slice(0, limit);
}

const DEAL_SELECT_COLS =
  "id, title, value, status, pipeline_id, stage_id, next_action, next_action_date, updated_at, companies(name), pipeline_stages(name, color, probability)";

/**
 * Lädt Top-10-Deals einer Pipeline: status='active', sortiert nach (value * probability) DESC.
 * Server-side Sort über die Mapper-Pipeline.
 */
export async function getTopDeals({
  pipelineId,
  limit = 10,
}: {
  pipelineId: string;
  limit?: number;
}): Promise<DealCardData[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select(DEAL_SELECT_COLS)
    .eq("pipeline_id", pipelineId)
    .eq("status", "active");
  if (error) throw new Error(error.message);
  const cards = (data ?? []).map((row) => mapRawDealToCard(row as RawDealRow));
  return selectTopActiveDeals(cards, limit);
}

/**
 * Lädt alle aktiven Deals einer Pipeline (für Karten-Grid unterhalb Top-10).
 */
export async function getActiveDeals(pipelineId: string): Promise<DealCardData[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select(DEAL_SELECT_COLS)
    .eq("pipeline_id", pipelineId)
    .eq("status", "active")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRawDealToCard(row as RawDealRow));
}

/**
 * Lädt Won/Lost-Deals einer Pipeline mit 90-Tage-Fenster + Pagination.
 *
 * @param status 'won' oder 'lost'
 * @param windowDays 90 für Default-Batch
 * @param offset Anzahl bereits geladener Batches (0 = erste 90 Tage)
 */
export async function getClosedDeals({
  pipelineId,
  status,
  windowDays = 90,
  offsetBatches = 0,
}: {
  pipelineId: string;
  status: "won" | "lost";
  windowDays?: number;
  offsetBatches?: number;
}): Promise<DealCardData[]> {
  const supabase = await createClient();
  const fromMs = Date.now() - (offsetBatches + 1) * windowDays * 24 * 60 * 60 * 1000;
  const toMs = Date.now() - offsetBatches * windowDays * 24 * 60 * 60 * 1000;
  const { data, error } = await supabase
    .from("deals")
    .select(DEAL_SELECT_COLS)
    .eq("pipeline_id", pipelineId)
    .eq("status", status)
    .gte("updated_at", new Date(fromMs).toISOString())
    .lt("updated_at", new Date(toMs).toISOString())
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRawDealToCard(row as RawDealRow));
}
