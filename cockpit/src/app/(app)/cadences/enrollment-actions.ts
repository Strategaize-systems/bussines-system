"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  CadenceEnrollment,
  CadenceEnrollmentWithContext,
  EnrollmentStatus,
} from "@/types/cadence";

// =============================================================
// Read
// =============================================================

export async function getEnrollmentsForCadence(
  cadenceId: string,
  status?: EnrollmentStatus
) {
  const supabase = await createClient();

  let query = supabase
    .from("cadence_enrollments")
    .select(
      "*, deals(id, title, status), contacts(id, first_name, last_name, email)"
    )
    .eq("cadence_id", cadenceId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((e) => ({
    ...e,
    deal: e.deals ?? null,
    contact: e.contacts ?? null,
    deals: undefined,
    contacts: undefined,
  })) as CadenceEnrollmentWithContext[];
}

export async function getEnrollmentsForDeal(dealId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cadence_enrollments")
    .select("*, cadences(id, name, status)")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((e) => ({
    ...e,
    cadence: e.cadences ?? null,
    cadences: undefined,
  })) as CadenceEnrollmentWithContext[];
}

export async function getEnrollmentsForContact(contactId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cadence_enrollments")
    .select("*, cadences(id, name, status)")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((e) => ({
    ...e,
    cadence: e.cadences ?? null,
    cadences: undefined,
  })) as CadenceEnrollmentWithContext[];
}

// =============================================================
// Enroll
// =============================================================

export async function enrollInCadence(params: {
  cadenceId: string;
  dealId?: string;
  contactId?: string;
}) {
  if (!params.dealId && !params.contactId) {
    return { error: "Deal oder Kontakt muss angegeben werden." };
  }

  const supabase = await createClient();

  // Get first step to determine initial next_execute_at
  const { data: firstStep } = await supabase
    .from("cadence_steps")
    .select("delay_days")
    .eq("cadence_id", params.cadenceId)
    .order("step_order", { ascending: true })
    .limit(1)
    .single();

  if (!firstStep) {
    return { error: "Cadence hat keine Schritte." };
  }

  // Calculate next_execute_at: now + first step delay_days
  const nextExecute = new Date();
  nextExecute.setDate(nextExecute.getDate() + firstStep.delay_days);

  const { data, error } = await supabase
    .from("cadence_enrollments")
    .insert({
      cadence_id: params.cadenceId,
      deal_id: params.dealId || null,
      contact_id: params.contactId || null,
      status: "active",
      current_step_order: 1,
      next_execute_at: nextExecute.toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    // Handle unique constraint violation (already enrolled)
    if (error.code === "23505") {
      return { error: "Bereits aktiv in dieser Cadence eingebucht." };
    }
    return { error: error.message };
  }

  revalidatePath("/cadences");
  if (params.dealId) revalidatePath(`/deals/${params.dealId}`);
  if (params.contactId) revalidatePath(`/contacts/${params.contactId}`);

  return { error: "", id: data.id };
}

// =============================================================
// Pause / Resume / Stop
// =============================================================

export async function pauseEnrollment(enrollmentId: string) {
  const supabase = await createClient();

  const { data: enrollment } = await supabase
    .from("cadence_enrollments")
    .select("status")
    .eq("id", enrollmentId)
    .single();

  if (!enrollment || enrollment.status !== "active") {
    return { error: "Enrollment ist nicht aktiv." };
  }

  const { error } = await supabase
    .from("cadence_enrollments")
    .update({
      status: "paused" as EnrollmentStatus,
    })
    .eq("id", enrollmentId);

  if (error) return { error: error.message };

  revalidatePath("/cadences");
  return { error: "" };
}

export async function resumeEnrollment(enrollmentId: string) {
  const supabase = await createClient();

  const { data: enrollment } = await supabase
    .from("cadence_enrollments")
    .select("status, next_execute_at")
    .eq("id", enrollmentId)
    .single();

  if (!enrollment || enrollment.status !== "paused") {
    return { error: "Enrollment ist nicht pausiert." };
  }

  // If next_execute_at is in the past, set to now (will be picked up on next cron run)
  const nextExecute = new Date(enrollment.next_execute_at);
  const now = new Date();
  const adjustedNext = nextExecute < now ? now.toISOString() : enrollment.next_execute_at;

  const { error } = await supabase
    .from("cadence_enrollments")
    .update({
      status: "active" as EnrollmentStatus,
      next_execute_at: adjustedNext,
    })
    .eq("id", enrollmentId);

  if (error) return { error: error.message };

  revalidatePath("/cadences");
  return { error: "" };
}

export async function stopEnrollment(enrollmentId: string, reason?: string) {
  const supabase = await createClient();

  const { data: enrollment } = await supabase
    .from("cadence_enrollments")
    .select("status")
    .eq("id", enrollmentId)
    .single();

  if (!enrollment || (enrollment.status !== "active" && enrollment.status !== "paused")) {
    return { error: "Enrollment ist nicht aktiv oder pausiert." };
  }

  const { error } = await supabase
    .from("cadence_enrollments")
    .update({
      status: "stopped" as EnrollmentStatus,
      stopped_at: new Date().toISOString(),
      stop_reason: reason || "manual",
    })
    .eq("id", enrollmentId);

  if (error) return { error: error.message };

  revalidatePath("/cadences");
  return { error: "" };
}
