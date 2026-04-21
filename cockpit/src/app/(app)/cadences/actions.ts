"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  Cadence,
  CadenceWithSteps,
  CadenceStep,
  CadenceStatus,
  CadenceStepType,
} from "@/types/cadence";

// =============================================================
// Read
// =============================================================

export async function getCadences(status?: CadenceStatus) {
  const supabase = await createClient();

  let query = supabase
    .from("cadences")
    .select("*, cadence_steps(count)")
    .order("updated_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((c) => ({
    ...c,
    enrollment_count: undefined,
    steps: [],
  })) as CadenceWithSteps[];
}

export async function getCadenceById(id: string): Promise<CadenceWithSteps | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cadences")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  const { data: steps } = await supabase
    .from("cadence_steps")
    .select("*")
    .eq("cadence_id", id)
    .order("step_order", { ascending: true });

  // Count active enrollments
  const { count } = await supabase
    .from("cadence_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("cadence_id", id)
    .eq("status", "active");

  return {
    ...(data as Cadence),
    steps: (steps ?? []) as CadenceStep[],
    enrollment_count: count ?? 0,
  };
}

// =============================================================
// Cadence CRUD
// =============================================================

export async function createCadence(params: {
  name: string;
  description?: string;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cadences")
    .insert({
      name: params.name,
      description: params.description || null,
      status: "active",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/cadences");
  return { error: "", id: data.id };
}

export async function updateCadence(
  id: string,
  params: { name?: string; description?: string; status?: CadenceStatus }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("cadences")
    .update({
      ...(params.name !== undefined ? { name: params.name } : {}),
      ...(params.description !== undefined ? { description: params.description } : {}),
      ...(params.status !== undefined ? { status: params.status } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/cadences");
  return { error: "" };
}

export async function deleteCadence(id: string) {
  const supabase = await createClient();

  // Check for active enrollments
  const { count } = await supabase
    .from("cadence_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("cadence_id", id)
    .eq("status", "active");

  if (count && count > 0) {
    return { error: "Cadence hat aktive Enrollments und kann nicht geloescht werden." };
  }

  const { error } = await supabase.from("cadences").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/cadences");
  return { error: "" };
}

// =============================================================
// Step CRUD
// =============================================================

export async function addStep(
  cadenceId: string,
  params: {
    step_type: CadenceStepType;
    delay_days: number;
    email_subject?: string;
    email_body?: string;
    task_title?: string;
    task_description?: string;
  }
) {
  const supabase = await createClient();

  // Get next step_order
  const { data: existing } = await supabase
    .from("cadence_steps")
    .select("step_order")
    .eq("cadence_id", cadenceId)
    .order("step_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].step_order + 1 : 1;

  const { data, error } = await supabase
    .from("cadence_steps")
    .insert({
      cadence_id: cadenceId,
      step_order: nextOrder,
      step_type: params.step_type,
      delay_days: params.delay_days,
      email_subject: params.email_subject || null,
      email_body: params.email_body || null,
      task_title: params.task_title || null,
      task_description: params.task_description || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Touch cadence updated_at
  await supabase
    .from("cadences")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", cadenceId);

  revalidatePath("/cadences");
  return { error: "", id: data.id };
}

export async function updateStep(
  stepId: string,
  params: {
    step_type?: CadenceStepType;
    delay_days?: number;
    email_subject?: string;
    email_body?: string;
    task_title?: string;
    task_description?: string;
  }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("cadence_steps")
    .update({
      ...(params.step_type !== undefined ? { step_type: params.step_type } : {}),
      ...(params.delay_days !== undefined ? { delay_days: params.delay_days } : {}),
      ...(params.email_subject !== undefined ? { email_subject: params.email_subject } : {}),
      ...(params.email_body !== undefined ? { email_body: params.email_body } : {}),
      ...(params.task_title !== undefined ? { task_title: params.task_title } : {}),
      ...(params.task_description !== undefined ? { task_description: params.task_description } : {}),
    })
    .eq("id", stepId);

  if (error) return { error: error.message };

  revalidatePath("/cadences");
  return { error: "" };
}

export async function removeStep(stepId: string) {
  const supabase = await createClient();

  // Get the step to know cadence_id and step_order
  const { data: step } = await supabase
    .from("cadence_steps")
    .select("cadence_id, step_order")
    .eq("id", stepId)
    .single();

  if (!step) return { error: "Step nicht gefunden." };

  const { error } = await supabase.from("cadence_steps").delete().eq("id", stepId);
  if (error) return { error: error.message };

  // Re-order remaining steps
  const { data: remaining } = await supabase
    .from("cadence_steps")
    .select("id, step_order")
    .eq("cadence_id", step.cadence_id)
    .gt("step_order", step.step_order)
    .order("step_order", { ascending: true });

  for (const r of remaining ?? []) {
    await supabase
      .from("cadence_steps")
      .update({ step_order: r.step_order - 1 })
      .eq("id", r.id);
  }

  // Touch cadence updated_at
  await supabase
    .from("cadences")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", step.cadence_id);

  revalidatePath("/cadences");
  return { error: "" };
}

export async function reorderSteps(cadenceId: string, stepIds: string[]) {
  const supabase = await createClient();

  for (let i = 0; i < stepIds.length; i++) {
    const { error } = await supabase
      .from("cadence_steps")
      .update({ step_order: i + 1 })
      .eq("id", stepIds[i])
      .eq("cadence_id", cadenceId);

    if (error) return { error: error.message };
  }

  await supabase
    .from("cadences")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", cadenceId);

  revalidatePath("/cadences");
  return { error: "" };
}
