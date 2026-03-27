"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CalendarEntry = {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  channel: string | null;
  status: string;
  planned_date: string | null;
  published_date: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export async function getEntries(params?: {
  month?: string; // YYYY-MM
  contentType?: string;
  status?: string;
  channel?: string;
}) {
  const supabase = await createClient();

  let query = supabase
    .from("content_calendar")
    .select("*")
    .order("planned_date", { ascending: true });

  if (params?.month) {
    const start = `${params.month}-01`;
    const [y, m] = params.month.split("-").map(Number);
    const end = new Date(y, m, 0).toISOString().split("T")[0]; // last day of month
    query = query.gte("planned_date", start).lte("planned_date", end);
  }

  if (params?.contentType) query = query.eq("content_type", params.contentType);
  if (params?.status) query = query.eq("status", params.status);
  if (params?.channel) query = query.eq("channel", params.channel);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as CalendarEntry[];
}

export async function createEntry(formData: FormData) {
  const supabase = await createClient();

  const tags = (formData.get("tags") as string)
    ?.split(",")
    .map((t) => t.trim())
    .filter(Boolean) ?? [];

  const { error } = await supabase.from("content_calendar").insert({
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    content_type: formData.get("content_type") as string,
    channel: (formData.get("channel") as string) || null,
    status: "planned",
    planned_date: (formData.get("planned_date") as string) || null,
    tags,
  });

  if (error) return { error: error.message };

  revalidatePath("/calendar");
  return { error: "" };
}

export async function updateEntry(id: string, formData: FormData) {
  const supabase = await createClient();

  const tags = (formData.get("tags") as string)
    ?.split(",")
    .map((t) => t.trim())
    .filter(Boolean) ?? [];

  const { error } = await supabase
    .from("content_calendar")
    .update({
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || null,
      content_type: formData.get("content_type") as string,
      channel: (formData.get("channel") as string) || null,
      planned_date: (formData.get("planned_date") as string) || null,
      tags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/calendar");
  return { error: "" };
}

export async function updateStatus(id: string, status: string) {
  const supabase = await createClient();

  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "published") {
    updates.published_date = new Date().toISOString().split("T")[0];
  }

  const { error } = await supabase
    .from("content_calendar")
    .update(updates)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/calendar");
  return { error: "" };
}

export async function deleteEntry(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("content_calendar").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/calendar");
  return { error: "" };
}
