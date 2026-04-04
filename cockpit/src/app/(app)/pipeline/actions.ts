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
  opportunity_type: string | null;
  won_lost_reason: string | null;
  won_lost_details: string | null;
  closed_at: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  contacts?: { id: string; first_name: string; last_name: string } | null;
  companies?: { id: string; name: string } | null;
};

const WON_STAGE_NAMES = ["Gewonnen"];
const LOST_STAGE_NAMES = ["Verloren", "Inaktiv / disqualifiziert"];

// ── Pipeline queries ─────────────────────────────────────────────────

const PIPELINE_SLUGS: Record<string, string> = {
  multiplikatoren: "Multiplikatoren",
  unternehmer: "Unternehmer-Chancen",
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

export async function getDealWithRelations(dealId: string) {
  const supabase = await createClient();

  const [dealResult, activitiesResult, proposalsResult, signalsResult, emailsResult] = await Promise.all([
    supabase
      .from("deals")
      .select("*, contacts(id, first_name, last_name, email, phone, position), companies(id, name, industry, email, phone)")
      .eq("id", dealId)
      .single(),
    supabase
      .from("activities")
      .select("*")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("proposals")
      .select("*")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false }),
    supabase
      .from("signals")
      .select("*")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false }),
    supabase
      .from("emails")
      .select("*")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false }),
  ]);

  if (dealResult.error) throw new Error(dealResult.error.message);

  return {
    deal: dealResult.data,
    activities: activitiesResult.data ?? [],
    proposals: proposalsResult.data ?? [],
    signals: signalsResult.data ?? [],
    emails: emailsResult.data ?? [],
  };
}

// ── Deal mutations ───────────────────────────────────────────────────

export async function createDeal(formData: FormData) {
  const supabase = await createClient();

  const tags = (formData.get("tags") as string)
    ?.split(",")
    .map((t) => t.trim())
    .filter(Boolean) ?? [];

  const contactId = (formData.get("contact_id") as string) || null;
  const companyId = (formData.get("company_id") as string) || null;
  const title = formData.get("title") as string;

  const { data: newDeal, error } = await supabase.from("deals").insert({
    pipeline_id: formData.get("pipeline_id") as string,
    stage_id: formData.get("stage_id") as string,
    contact_id: contactId,
    company_id: companyId,
    title,
    value: formData.get("value") ? Number(formData.get("value")) : null,
    expected_close_date: (formData.get("expected_close_date") as string) || null,
    next_action: (formData.get("next_action") as string) || null,
    next_action_date: (formData.get("next_action_date") as string) || null,
    opportunity_type: (formData.get("opportunity_type") as string) || null,
    won_lost_reason: (formData.get("won_lost_reason") as string) || null,
    won_lost_details: (formData.get("won_lost_details") as string) || null,
    tags,
  }).select("id").single();

  if (error) return { error: error.message };

  // Log deal creation
  if (newDeal) {
    await supabase.from("activities").insert({
      contact_id: contactId,
      company_id: companyId,
      deal_id: newDeal.id,
      type: "note",
      title: `Deal "${title}" erstellt`,
    });
  }

  revalidatePath("/pipeline");
  return { error: "" };
}

export async function updateDeal(id: string, formData: FormData) {
  const supabase = await createClient();

  const tags = (formData.get("tags") as string)
    ?.split(",")
    .map((t) => t.trim())
    .filter(Boolean) ?? [];

  const status = (formData.get("status") as string) || "active";
  const title = formData.get("title") as string;
  const contactId = (formData.get("contact_id") as string) || null;
  const companyId = (formData.get("company_id") as string) || null;

  const { error } = await supabase
    .from("deals")
    .update({
      stage_id: (formData.get("stage_id") as string) || null,
      contact_id: contactId,
      company_id: companyId,
      title,
      value: formData.get("value") ? Number(formData.get("value")) : null,
      expected_close_date: (formData.get("expected_close_date") as string) || null,
      next_action: (formData.get("next_action") as string) || null,
      next_action_date: (formData.get("next_action_date") as string) || null,
      opportunity_type: (formData.get("opportunity_type") as string) || null,
      won_lost_reason: (formData.get("won_lost_reason") as string) || null,
      won_lost_details: (formData.get("won_lost_details") as string) || null,
      status,
      closed_at: status === "won" || status === "lost" ? new Date().toISOString() : null,
      tags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  // Log deal update
  await supabase.from("activities").insert({
    contact_id: contactId,
    company_id: companyId,
    deal_id: id,
    type: "note",
    title: `Deal "${title}" aktualisiert${status !== "active" ? ` (${status})` : ""}`,
  });

  revalidatePath("/pipeline");
  return { error: "" };
}

// Required fields per stage (hardcoded mapping)
const STAGE_REQUIRED_FIELDS: Record<string, { fields: string[]; labels: Record<string, string> }> = {
  "Angebot vorbereitet": {
    fields: ["value"],
    labels: { value: "Deal-Wert" },
  },
  "Angebot offen": {
    fields: ["value"],
    labels: { value: "Deal-Wert" },
  },
  "Verhandlung / Einwände": {
    fields: ["value", "contact_id"],
    labels: { value: "Deal-Wert", contact_id: "Kontakt" },
  },
  "Gewonnen": {
    fields: ["value"],
    labels: { value: "Deal-Wert" },
  },
  "Verloren": {
    fields: ["won_lost_reason"],
    labels: { won_lost_reason: "Verlustgrund" },
  },
};

export async function moveDealToStage(dealId: string, newStageId: string, stageName: string) {
  const supabase = await createClient();

  // Validate required fields for target stage
  const requirements = STAGE_REQUIRED_FIELDS[stageName];
  if (requirements) {
    const { data: deal } = await supabase
      .from("deals")
      .select("value, contact_id, company_id, won_lost_reason")
      .eq("id", dealId)
      .single();

    if (deal) {
      const missing: string[] = [];
      for (const field of requirements.fields) {
        const val = (deal as any)[field];
        if (val === null || val === undefined || val === "") {
          missing.push(requirements.labels[field] ?? field);
        }
      }
      if (missing.length > 0) {
        return { error: `Pflichtfelder für "${stageName}": ${missing.join(", ")}` };
      }
    }
  }

  // Determine auto-status based on stage name
  let autoStatus: string | undefined;
  let closedAt: string | null | undefined;

  if (WON_STAGE_NAMES.includes(stageName)) {
    autoStatus = "won";
    closedAt = new Date().toISOString();
  } else if (LOST_STAGE_NAMES.includes(stageName)) {
    autoStatus = "lost";
    closedAt = new Date().toISOString();
  } else {
    autoStatus = "active";
    closedAt = null;
  }

  // Update deal stage + status
  const { error: dealError } = await supabase
    .from("deals")
    .update({
      stage_id: newStageId,
      status: autoStatus,
      closed_at: closedAt,
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
      title: `Deal "${deal.title}" → ${stageName}${autoStatus !== "active" ? ` (${autoStatus})` : ""}`,
    });
  }

  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  return { error: "" };
}

export async function getDealsForSelect() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select("id, title")
    .eq("status", "active")
    .order("title");

  if (error) throw new Error(error.message);
  return data as { id: string; title: string }[];
}

export async function deleteDeal(id: string) {
  const supabase = await createClient();

  // Get deal info for activity log before deleting
  const { data: deal } = await supabase
    .from("deals")
    .select("title, contact_id, company_id")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("deals").delete().eq("id", id);

  if (error) return { error: error.message };

  // Log deletion (without deal_id since deal is gone)
  if (deal) {
    await supabase.from("activities").insert({
      contact_id: deal.contact_id,
      company_id: deal.company_id,
      type: "note",
      title: `Deal "${deal.title}" gelöscht`,
    });
  }

  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
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

