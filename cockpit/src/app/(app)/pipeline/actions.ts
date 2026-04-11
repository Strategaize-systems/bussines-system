"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

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
  leads: "Lead-Management",
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
    referral_source_id: (formData.get("referral_source_id") as string) || null,
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

    // Audit trail — fire and forget
    logAudit({
      action: "create",
      entityType: "deal",
      entityId: newDeal.id,
      changes: { after: { title, value: formData.get("value") ? Number(formData.get("value")) : null, contact_id: contactId, company_id: companyId } },
      context: "Deal erstellt",
    }).catch(() => {});
  }

  revalidatePath("/pipeline");
  revalidatePath("/deals");
  return { error: "" };
}

export async function updateDeal(id: string, formData: FormData) {
  const supabase = await createClient();

  // Fetch old deal data for audit trail before update
  const { data: oldDeal } = await supabase
    .from("deals")
    .select("title, value, status, contact_id, company_id, stage_id, opportunity_type")
    .eq("id", id)
    .single();

  const tags = (formData.get("tags") as string)
    ?.split(",")
    .map((t) => t.trim())
    .filter(Boolean) ?? [];

  const status = (formData.get("status") as string) || "active";
  const title = formData.get("title") as string;
  const contactId = (formData.get("contact_id") as string) || null;
  const companyId = (formData.get("company_id") as string) || null;

  const updatePayload = {
    stage_id: (formData.get("stage_id") as string) || null,
    contact_id: contactId,
    company_id: companyId,
    title,
    value: formData.get("value") ? Number(formData.get("value")) : null,
    expected_close_date: (formData.get("expected_close_date") as string) || null,
    next_action: (formData.get("next_action") as string) || null,
    next_action_date: (formData.get("next_action_date") as string) || null,
    opportunity_type: (formData.get("opportunity_type") as string) || null,
    referral_source_id: (formData.get("referral_source_id") as string) || null,
    won_lost_reason: (formData.get("won_lost_reason") as string) || null,
    won_lost_details: (formData.get("won_lost_details") as string) || null,
    status,
    closed_at: status === "won" || status === "lost" ? new Date().toISOString() : null,
    tags,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("deals")
    .update(updatePayload)
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

  // Audit trail — fire and forget
  logAudit({
    action: "update",
    entityType: "deal",
    entityId: id,
    changes: {
      before: oldDeal ? { title: oldDeal.title, value: oldDeal.value, status: oldDeal.status } : undefined,
      after: { title, value: updatePayload.value, status },
    },
    context: "Deal aktualisiert",
  }).catch(() => {});

  revalidatePath("/pipeline");
  revalidatePath("/deals");
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

  // Fetch current deal state for validation + audit trail
  const { data: currentDeal } = await supabase
    .from("deals")
    .select("title, value, status, contact_id, company_id, won_lost_reason, stage_id, pipeline_stages(name)")
    .eq("id", dealId)
    .single();

  // Validate required fields for target stage
  const requirements = STAGE_REQUIRED_FIELDS[stageName];
  if (requirements && currentDeal) {
    const missing: string[] = [];
    for (const field of requirements.fields) {
      const val = (currentDeal as any)[field];
      if (val === null || val === undefined || val === "") {
        missing.push(requirements.labels[field] ?? field);
      }
    }
    if (missing.length > 0) {
      return { error: `Pflichtfelder für "${stageName}": ${missing.join(", ")}` };
    }
  }

  const oldStageName = (currentDeal?.pipeline_stages as any)?.name ?? "Unbekannt";
  const oldStatus = currentDeal?.status ?? "active";

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

  // Log stage change as activity
  if (currentDeal) {
    await supabase.from("activities").insert({
      contact_id: currentDeal.contact_id,
      company_id: currentDeal.company_id,
      deal_id: dealId,
      type: "stage_change",
      title: `Deal "${currentDeal.title}" → ${stageName}${autoStatus !== "active" ? ` (${autoStatus})` : ""}`,
    });
  }

  // Audit trail: stage change — fire and forget
  logAudit({
    action: "stage_change",
    entityType: "deal",
    entityId: dealId,
    changes: {
      before: { stage: oldStageName },
      after: { stage: stageName },
    },
    context: `Pipeline Stage: ${oldStageName} → ${stageName}`,
  }).catch(() => {});

  // Audit trail: status change (won/lost) — separate entry, fire and forget
  if (autoStatus !== oldStatus && autoStatus !== "active") {
    logAudit({
      action: "status_change",
      entityType: "deal",
      entityId: dealId,
      changes: {
        before: { status: oldStatus },
        after: { status: autoStatus },
      },
      context: `Status: ${oldStatus} → ${autoStatus}`,
    }).catch(() => {});
  }

  revalidatePath("/pipeline");
  revalidatePath("/deals");
  revalidatePath("/dashboard");
  return { error: "" };
}

export async function moveDealToPipeline(dealId: string, targetPipelineId: string) {
  const supabase = await createClient();

  // Get first stage of target pipeline
  const { data: firstStage } = await supabase
    .from("pipeline_stages")
    .select("id, name")
    .eq("pipeline_id", targetPipelineId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .single();

  if (!firstStage) return { error: "Ziel-Pipeline hat keine Stages" };

  // Get deal info for activity log
  const { data: deal } = await supabase
    .from("deals")
    .select("title, contact_id, company_id")
    .eq("id", dealId)
    .single();

  // Get target pipeline name
  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("name")
    .eq("id", targetPipelineId)
    .single();

  // Move deal
  const { error } = await supabase
    .from("deals")
    .update({
      pipeline_id: targetPipelineId,
      stage_id: firstStage.id,
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", dealId);

  if (error) return { error: error.message };

  // Log activity
  if (deal && pipeline) {
    await supabase.from("activities").insert({
      contact_id: deal.contact_id,
      company_id: deal.company_id,
      deal_id: dealId,
      type: "stage_change",
      title: `Deal "${deal.title}" → Pipeline "${pipeline.name}" (${firstStage.name})`,
    });
  }

  revalidatePath("/pipeline");
  revalidatePath("/deals");
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

  // Get deal info for activity log + audit trail before deleting
  const { data: deal } = await supabase
    .from("deals")
    .select("title, value, status, contact_id, company_id")
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

  // Audit trail — fire and forget
  logAudit({
    action: "delete",
    entityType: "deal",
    entityId: id,
    changes: {
      before: deal ? { title: deal.title, value: deal.value, status: deal.status } : undefined,
    },
    context: `Deal "${deal?.title ?? id}" gelöscht`,
  }).catch(() => {});

  revalidatePath("/pipeline");
  revalidatePath("/deals");
  revalidatePath("/dashboard");
  return { error: "" };
}

export async function getReferralsForSelect() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("referrals")
    .select("id, referrer:referrer_id(first_name, last_name), referred_contact:referred_contact_id(first_name, last_name), referred_company:referred_company_id(name)")
    .order("created_at", { ascending: false });

  if (error) return [];

  return (data || []).map((r: any) => {
    const referrer = r.referrer ? `${r.referrer.first_name} ${r.referrer.last_name}` : "Unbekannt";
    const target = r.referred_contact
      ? `${r.referred_contact.first_name} ${r.referred_contact.last_name}`
      : r.referred_company?.name ?? "—";
    return { id: r.id, label: `${referrer} → ${target}` };
  });
}

// ── Pipeline mutations (Settings) ───────────────────────────────────

const DEFAULT_STAGES = [
  { name: "Qualifizierung", color: "#6366f1", probability: 10 },
  { name: "Erstgespräch", color: "#8b5cf6", probability: 20 },
  { name: "Angebot vorbereitet", color: "#3b82f6", probability: 40 },
  { name: "Angebot offen", color: "#0ea5e9", probability: 50 },
  { name: "Verhandlung / Einwände", color: "#f59e0b", probability: 70 },
  { name: "Gewonnen", color: "#22c55e", probability: 100 },
  { name: "Verloren", color: "#ef4444", probability: 0 },
];

export async function createPipeline(formData: FormData) {
  const supabase = await createClient();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Pipeline-Name ist erforderlich" };

  const description = (formData.get("description") as string)?.trim() || null;

  // Get max sort_order
  const { data: existing } = await supabase
    .from("pipelines")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing?.[0] ? existing[0].sort_order + 1 : 1;

  const { data: newPipeline, error } = await supabase
    .from("pipelines")
    .insert({ name, description, sort_order: nextOrder })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Create default stages
  const useDefaults = formData.get("use_defaults") !== "false";
  if (useDefaults && newPipeline) {
    const stageInserts = DEFAULT_STAGES.map((s, i) => ({
      pipeline_id: newPipeline.id,
      name: s.name,
      color: s.color,
      probability: s.probability,
      sort_order: i + 1,
    }));

    await supabase.from("pipeline_stages").insert(stageInserts);
  }

  logAudit({
    action: "create",
    entityType: "pipeline",
    entityId: newPipeline?.id ?? "",
    changes: { after: { name, description } },
    context: `Pipeline "${name}" erstellt`,
  }).catch(() => {});

  revalidatePath("/pipeline");
  revalidatePath("/settings");
  return { error: "", id: newPipeline?.id };
}

export async function updatePipeline(id: string, formData: FormData) {
  const supabase = await createClient();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Pipeline-Name ist erforderlich" };

  const description = (formData.get("description") as string)?.trim() || null;

  const { data: oldPipeline } = await supabase
    .from("pipelines")
    .select("name, description")
    .eq("id", id)
    .single();


  const { error } = await supabase
    .from("pipelines")
    .update({ name, description })
    .eq("id", id);

  if (error) return { error: error.message };

  logAudit({
    action: "update",
    entityType: "pipeline",
    entityId: id,
    changes: {
      before: oldPipeline ? { name: oldPipeline.name } : undefined,
      after: { name },
    },
    context: `Pipeline umbenannt: ${oldPipeline?.name ?? "?"} → ${name}`,
  }).catch(() => {});

  revalidatePath("/pipeline");
  revalidatePath("/settings");
  return { error: "" };
}

export async function deletePipeline(id: string) {
  const supabase = await createClient();

  // Check for deals in this pipeline
  const { count } = await supabase
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("pipeline_id", id);

  if (count && count > 0) {
    return { error: `Pipeline enthält noch ${count} Deal(s). Bitte verschiebe oder lösche diese zuerst.` };
  }

  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("name")
    .eq("id", id)
    .single();

  // Delete stages first (cascade may not be set)
  await supabase.from("pipeline_stages").delete().eq("pipeline_id", id);

  const { error } = await supabase.from("pipelines").delete().eq("id", id);

  if (error) return { error: error.message };

  logAudit({
    action: "delete",
    entityType: "pipeline",
    entityId: id,
    changes: { before: pipeline ? { name: pipeline.name } : undefined },
    context: `Pipeline "${pipeline?.name ?? id}" gelöscht`,
  }).catch(() => {});

  revalidatePath("/pipeline");
  revalidatePath("/settings");
  return { error: "" };
}

export async function getPipelineById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pipelines")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as Pipeline;
}

// ── Stage mutations (Settings) ───────────────────────────────────────

export async function createStage(formData: FormData) {
  const supabase = await createClient();

  const stageName = (formData.get("name") as string)?.trim();
  if (!stageName) return { error: "Stage-Name ist erforderlich" };

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
    name: stageName,
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

