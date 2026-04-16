"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type RecordingStatus =
  | "not_recording"
  | "pending"
  | "recording"
  | "uploading"
  | "completed"
  | "failed"
  | "deleted";

export type TranscriptStatus = "pending" | "processing" | "completed" | "failed";
export type SummaryStatus = "pending" | "processing" | "completed" | "failed";

export type AiSummary = {
  outcome?: string;
  decisions?: string[];
  action_items?: string[];
  next_step?: string;
};

export type ReminderSentEntry = {
  type: string;
  recipient: string;
  sent_at: string;
};

export type Meeting = {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  participants: string | null;
  agenda: string | null;
  outcome: string | null;
  notes: string | null;
  transcript: string | null;
  deal_id: string | null;
  contact_id: string | null;
  company_id: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  jitsi_room_name: string | null;
  recording_url: string | null;
  recording_status: RecordingStatus;
  recording_started_at: string | null;
  recording_duration_seconds: number | null;
  transcript_status: TranscriptStatus | null;
  summary_status: SummaryStatus | null;
  ai_summary: AiSummary | null;
  ai_agenda: string | null;
  ai_agenda_generated_at: string | null;
  reminders_sent: ReminderSentEntry[];
  contacts?: { id: string; first_name: string; last_name: string } | null;
  companies?: { id: string; name: string } | null;
  deals?: { id: string; title: string } | null;
};

// ── Queries ─────────────────────────────────────────────────────────

export async function getMeetings(filters?: { status?: string }) {
  const supabase = await createClient();

  let query = supabase
    .from("meetings")
    .select(
      "*, contacts(id, first_name, last_name), companies(id, name), deals(id, title)"
    )
    .order("scheduled_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as Meeting[];
}

export async function getMeetingById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select(
      "*, contacts(id, first_name, last_name), companies(id, name), deals(id, title)"
    )
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data as Meeting;
}

export async function getMeetingsForDeal(dealId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select(
      "*, contacts(id, first_name, last_name), companies(id, name)"
    )
    .eq("deal_id", dealId)
    .order("scheduled_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Meeting[];
}

export async function getMeetingsForContact(contactId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select("*, contacts(id, first_name, last_name), companies(id, name)")
    .eq("contact_id", contactId)
    .order("scheduled_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Meeting[];
}

export async function getMeetingsForCompany(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select("*, contacts(id, first_name, last_name), companies(id, name)")
    .eq("company_id", companyId)
    .order("scheduled_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Meeting[];
}

export async function getUpcomingMeetings(limit: number = 5) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("meetings")
    .select(
      "*, contacts(id, first_name, last_name), companies(id, name), deals(id, title)"
    )
    .eq("status", "planned")
    .gte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data as Meeting[];
}

// ── Mutations ───────────────────────────────────────────────────────

export async function createMeeting(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const title = formData.get("title") as string;
  const scheduledAt = formData.get("scheduled_at") as string;
  const durationMinutes = formData.get("duration_minutes")
    ? Number(formData.get("duration_minutes"))
    : 60;
  const location = (formData.get("location") as string) || null;
  const participants = (formData.get("participants") as string) || null;
  const agenda = (formData.get("agenda") as string) || null;
  const status = (formData.get("status") as string) || "planned";
  const dealId = (formData.get("deal_id") as string) || null;
  const contactId = (formData.get("contact_id") as string) || null;
  const companyId = (formData.get("company_id") as string) || null;

  // 1. Create the meeting
  const { data: newMeeting, error } = await supabase
    .from("meetings")
    .insert({
      title,
      scheduled_at: scheduledAt,
      duration_minutes: durationMinutes,
      location,
      participants,
      agenda,
      status,
      deal_id: dealId,
      contact_id: contactId,
      company_id: companyId,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // 2. Auto-create Activity (source_type = 'meeting')
  if (newMeeting) {
    await supabase.from("activities").insert({
      type: "meeting",
      title,
      description: agenda,
      deal_id: dealId,
      contact_id: contactId,
      company_id: companyId,
      source_type: "meeting",
      source_id: newMeeting.id,
      created_by: user?.id ?? null,
    });

    // 3. Auto-create Calendar Event (type = 'meeting')
    const startTime = new Date(scheduledAt);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    await supabase.from("calendar_events").insert({
      title,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      type: "meeting",
      location,
      deal_id: dealId,
      contact_id: contactId,
      company_id: companyId,
      meeting_id: newMeeting.id,
      created_by: user?.id ?? null,
    });
  }

  revalidatePath("/meetings");
  revalidatePath("/termine");
  revalidatePath("/mein-tag");
  revalidatePath("/kalender");
  return { error: "" };
}

export async function updateMeeting(id: string, formData: FormData) {
  const supabase = await createClient();

  const title = formData.get("title") as string;
  const scheduledAt = formData.get("scheduled_at") as string;
  const durationMinutes = formData.get("duration_minutes")
    ? Number(formData.get("duration_minutes"))
    : 60;
  const location = (formData.get("location") as string) || null;
  const participants = (formData.get("participants") as string) || null;
  const agenda = (formData.get("agenda") as string) || null;
  const outcome = (formData.get("outcome") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const status = (formData.get("status") as string) || "planned";
  const dealId = (formData.get("deal_id") as string) || null;
  const contactId = (formData.get("contact_id") as string) || null;
  const companyId = (formData.get("company_id") as string) || null;

  const { error } = await supabase
    .from("meetings")
    .update({
      title,
      scheduled_at: scheduledAt,
      duration_minutes: durationMinutes,
      location,
      participants,
      agenda,
      outcome,
      notes,
      status,
      deal_id: dealId,
      contact_id: contactId,
      company_id: companyId,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  // Update linked calendar event
  const startTime = new Date(scheduledAt);
  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  await supabase
    .from("calendar_events")
    .update({
      title,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      location,
      deal_id: dealId,
      contact_id: contactId,
      company_id: companyId,
    })
    .eq("meeting_id", id);

  revalidatePath("/meetings");
  revalidatePath("/termine");
  revalidatePath("/mein-tag");
  revalidatePath("/kalender");
  revalidatePath("/focus");
  return { error: "" };
}

export async function deleteMeeting(id: string) {
  const supabase = await createClient();

  // Delete linked calendar event first (no cascade)
  await supabase.from("calendar_events").delete().eq("meeting_id", id);

  // Delete the meeting
  const { error } = await supabase.from("meetings").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/meetings");
  revalidatePath("/termine");
  revalidatePath("/mein-tag");
  revalidatePath("/kalender");
  return { error: "" };
}
