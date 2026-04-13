"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CalendarEvent = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  type: string;
  description: string | null;
  location: string | null;
  deal_id: string | null;
  contact_id: string | null;
  company_id: string | null;
  meeting_id: string | null;
  created_by: string | null;
  created_at: string;
  contacts?: { id: string; first_name: string; last_name: string } | null;
  companies?: { id: string; name: string } | null;
  deals?: { id: string; title: string } | null;
};

// ── Queries ─────────────────────────────────────────────────────────

export async function getCalendarEvents(filters?: {
  type?: string;
  startDate?: string;
  endDate?: string;
}) {
  const supabase = await createClient();

  let query = supabase
    .from("calendar_events")
    .select(
      "*, contacts(id, first_name, last_name), companies(id, name), deals(id, title)"
    )
    .order("start_time", { ascending: true });

  if (filters?.type && filters.type !== "all") {
    query = query.eq("type", filters.type);
  }
  if (filters?.startDate) {
    query = query.gte("start_time", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("start_time", filters.endDate);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as CalendarEvent[];
}

export async function getCalendarEventsForDay(date: string) {
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendar_events")
    .select(
      "*, contacts(id, first_name, last_name), companies(id, name), deals(id, title)"
    )
    .gte("start_time", dayStart)
    .lte("start_time", dayEnd)
    .order("start_time", { ascending: true });

  if (error) throw new Error(error.message);
  return data as CalendarEvent[];
}

export async function getCalendarEventsForWeek(startDate: string) {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendar_events")
    .select(
      "*, contacts(id, first_name, last_name), companies(id, name), deals(id, title)"
    )
    .gte("start_time", start.toISOString())
    .lt("start_time", end.toISOString())
    .order("start_time", { ascending: true });

  if (error) throw new Error(error.message);
  return data as CalendarEvent[];
}

// ── Mutations ───────────────────────────────────────────────────────

export async function createCalendarEvent(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("calendar_events").insert({
    title: formData.get("title") as string,
    start_time: formData.get("start_time") as string,
    end_time: formData.get("end_time") as string,
    type: (formData.get("type") as string) || "other",
    description: (formData.get("description") as string) || null,
    location: (formData.get("location") as string) || null,
    deal_id: (formData.get("deal_id") as string) || null,
    contact_id: (formData.get("contact_id") as string) || null,
    company_id: (formData.get("company_id") as string) || null,
    created_by: user?.id ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath("/termine");
  revalidatePath("/mein-tag");
  revalidatePath("/kalender");
  return { error: "" };
}

export async function updateCalendarEvent(id: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("calendar_events")
    .update({
      title: formData.get("title") as string,
      start_time: formData.get("start_time") as string,
      end_time: formData.get("end_time") as string,
      type: (formData.get("type") as string) || "other",
      description: (formData.get("description") as string) || null,
      location: (formData.get("location") as string) || null,
      deal_id: (formData.get("deal_id") as string) || null,
      contact_id: (formData.get("contact_id") as string) || null,
      company_id: (formData.get("company_id") as string) || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/termine");
  revalidatePath("/mein-tag");
  revalidatePath("/kalender");
  return { error: "" };
}

export async function deleteCalendarEvent(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/termine");
  revalidatePath("/mein-tag");
  revalidatePath("/kalender");
  return { error: "" };
}
