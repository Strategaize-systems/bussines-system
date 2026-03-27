"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type Pipeline = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
};

export type PipelineStage = {
  id: string;
  pipeline_id: string;
  name: string;
  color: string | null;
  sort_order: number;
  probability: number;
};

export type Deal = {
  id: string;
  pipeline_id: string;
  stage_id: string | null;
  contact_id: string | null;
  company_id: string | null;
  title: string;
  value: number | null;
  expected_close_date: string | null;
  next_action: string | null;
  next_action_date: string | null;
  status: string;
  lost_reason: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  contacts?: { id: string; first_name: string; last_name: string } | null;
  companies?: { id: string; name: string } | null;
};

// ── Pipeline queries ─────────────────────────────────────────────────

const PIPELINE_SLUGS: Record<string, string> = {
  endkunden: "Endkunden",
  multiplikatoren: "Multiplikatoren",
};

export async function getPipelines() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pipelines")
    .select("*")
    .order("sort_order");

  if (error) throw new Error(error.message);
  return data as Pipeline[];
}

export async function getPipelineBySlug(slug: string) {
  const name = PIPELINE_SLUGS[slug];
  if (!name) throw new Error(`Unknown pipeline slug: ${slug}`);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pipelines")
    .select("*")
    .eq("name", name)
    .single();

  if (error) throw new Error(error.message);
  return data as Pipeline;
}

export async function getPipelineStages(pipelineId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pipeline_stages")
    .select("*")
    .eq("pipeline_id", pipelineId)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return data as PipelineStage[];
}

// ── Deal queries ─────────────────────────────────────────────────────

export async function getDealsForPipeline(pipelineId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*, contacts(id, first_name, last_name), companies(id, name)")
    .eq("pipeline_id", pipelineId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Deal[];
}

// ── Deal mutations ───────────────────────────────────────────────────

export async function createDeal(formData: FormData) {
  const supabase = await createClient();

  const tags = (formData.get("tags") as string)
    ?.split(",")
    .map((t) => t.trim())
    .filter(Boolean) ?? [];

  const { error } = await supabase.from("deals").insert({
    pipeline_id: formData.get("pipeline_id") as string,
    stage_id: formData.get("stage_id") as string,
    contact_id: (formData.get("contact_id") as string) || null,
    company_id: (formData.get("company_id") as string) || null,
    title: formData.get("title") as string,
    value: formData.get("value") ? Number(formData.get("value")) : null,
    expected_close_date: (formData.get("expected_close_date") as string) || null,
    next_action: (formData.get("next_action") as string) || null,
    next_action_date: (formData.get("next_action_date") as string) || null,
    tags,
  });

  if (error) return { error: error.message };

  revalidatePath("/pipeline");
  return { error: "" };
}

export async function updateDeal(id: string, formData: FormData) {
  const supabase = await createClient();

  const tags = (formData.get("tags") as string)
    ?.split(",")
    .map((t) => t.trim())
    .filter(Boolean) ?? [];

  const { error } = await supabase
    .from("deals")
    .update({
      stage_id: (formData.get("stage_id") as string) || null,
      contact_id: (formData.get("contact_id") as string) || null,
      company_id: (formData.get("company_id") as string) || null,
      title: formData.get("title") as string,
      value: formData.get("value") ? Number(formData.get("value")) : null,
      expected_close_date: (formData.get("expected_close_date") as string) || null,
      next_action: (formData.get("next_action") as string) || null,
      next_action_date: (formData.get("next_action_date") as string) || null,
      tags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/pipeline");
  return { error: "" };
}

export async function moveDealToStage(dealId: string, newStageId: string, stageName: string) {
  const supabase = await createClient();

  // Update deal stage
  const { error: dealError } = await supabase
    .from("deals")
    .update({
      stage_id: newStageId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", dealId);

  if (dealError) return { error: dealError.message };

  // Get deal for activity log context
  const { data: deal } = await supabase
    .from("deals")
    .select("title, contact_id, company_id")
    .eq("id", dealId)
    .single();

  // Log stage change as activity
  if (deal) {
    await supabase.from("activities").insert({
      contact_id: deal.contact_id,
      company_id: deal.company_id,
      deal_id: dealId,
      type: "stage_change",
      title: `Deal "${deal.title}" → ${stageName}`,
    });
  }

  revalidatePath("/pipeline");
  return { error: "" };
}

export async function deleteDeal(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("deals").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/pipeline");
  return { error: "" };
}

// ── Stage mutations (Settings) ───────────────────────────────────────

export async function createStage(formData: FormData) {
  const supabase = await createClient();

  const pipelineId = formData.get("pipeline_id") as string;

  // Get max sort_order for this pipeline
  const { data: existing } = await supabase
    .from("pipeline_stages")
    .select("sort_order")
    .eq("pipeline_id", pipelineId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing?.[0] ? existing[0].sort_order + 1 : 1;

  const { error } = await supabase.from("pipeline_stages").insert({
    pipeline_id: pipelineId,
    name: formData.get("name") as string,
    color: (formData.get("color") as string) || "#6366f1",
    sort_order: nextOrder,
    probability: formData.get("probability") ? Number(formData.get("probability")) : 0,
  });

  if (error) return { error: error.message };

  revalidatePath("/pipeline");
  revalidatePath("/settings");
  return { error: "" };
}

export async function updateStage(id: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("pipeline_stages")
    .update({
      name: formData.get("name") as string,
      color: (formData.get("color") as string) || "#6366f1",
      probability: formData.get("probability") ? Number(formData.get("probability")) : 0,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/pipeline");
  revalidatePath("/settings");
  return { error: "" };
}

export async function deleteStage(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("pipeline_stages").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/pipeline");
  revalidatePath("/settings");
  return { error: "" };
}

