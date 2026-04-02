"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type FitAssessment = {
  id: string;
  entity_type: string;
  entity_id: string;
  exit_relevance_score: number | null;
  ai_readiness_score: number | null;
  decision_maker_score: number | null;
  budget_score: number | null;
  complexity_score: number | null;
  willingness_score: number | null;
  champion_score: number | null;
  strategic_score: number | null;
  target_access_score: number | null;
  trust_score: number | null;
  professionalism_score: number | null;
  referral_quality_score: number | null;
  cooperation_score: number | null;
  conflict_score: number | null;
  brand_fit_score: number | null;
  overall_score: number | null;
  traffic_light: string | null;
  verdict: string | null;
  reason: string | null;
  assessed_at: string;
};

export async function getFitAssessment(entityType: string, entityId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fit_assessments")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("assessed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as FitAssessment | null;
}

const COMPANY_FIELDS = [
  "exit_relevance_score", "ai_readiness_score", "decision_maker_score",
  "budget_score", "complexity_score", "willingness_score",
  "champion_score", "strategic_score",
] as const;

const MULTIPLIER_FIELDS = [
  "target_access_score", "trust_score", "professionalism_score",
  "referral_quality_score", "cooperation_score", "conflict_score",
  "brand_fit_score",
] as const;

function calcTrafficLight(avg: number): string {
  if (avg >= 4) return "green";
  if (avg >= 2.5) return "yellow";
  return "red";
}

export async function saveFitAssessment(formData: FormData) {
  const supabase = await createClient();

  const entityType = formData.get("entity_type") as string;
  const entityId = formData.get("entity_id") as string;

  const fields = entityType === "company" ? COMPANY_FIELDS : MULTIPLIER_FIELDS;
  const scores: Record<string, number | null> = {};
  let total = 0;
  let count = 0;

  for (const field of fields) {
    const val = formData.get(field) as string;
    const num = val ? Number(val) : null;
    scores[field] = num;
    if (num !== null) {
      total += num;
      count++;
    }
  }

  const overallScore = count > 0 ? Math.round((total / count) * 10) / 10 : null;
  const trafficLight = overallScore !== null ? calcTrafficLight(overallScore) : null;
  const verdict = (formData.get("verdict") as string) || null;
  const reason = (formData.get("reason") as string) || null;

  // Upsert: delete old, insert new
  await supabase
    .from("fit_assessments")
    .delete()
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);

  const { error } = await supabase.from("fit_assessments").insert({
    entity_type: entityType,
    entity_id: entityId,
    ...scores,
    overall_score: overallScore,
    traffic_light: trafficLight,
    verdict,
    reason,
  });

  if (error) return { error: error.message };

  if (entityType === "company") revalidatePath(`/companies/${entityId}`);
  else revalidatePath(`/contacts/${entityId}`);
  revalidatePath("/multiplikatoren");
  return { error: "" };
}
