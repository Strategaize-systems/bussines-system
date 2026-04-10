"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type Task = {
  id: string;
  contact_id: string | null;
  company_id: string | null;
  deal_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  completed_at: string | null;
  created_at: string;
  contacts?: { id: string; first_name: string; last_name: string } | null;
  companies?: { id: string; name: string } | null;
  deals?: { id: string; title: string } | null;
};

export async function getTasks(filter?: {
  status?: string;
  priority?: string;
  dealId?: string;
}) {
  const supabase = await createClient();

  let query = supabase
    .from("tasks")
    .select("*, contacts(id, first_name, last_name), companies(id, name), deals(id, title)")
    .order("due_date", { ascending: true, nullsFirst: false });

  if (filter?.status && filter.status !== "all") {
    query = query.eq("status", filter.status);
  }
  if (filter?.priority && filter.priority !== "all") {
    query = query.eq("priority", filter.priority);
  }
  if (filter?.dealId) {
    query = query.eq("deal_id", filter.dealId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as Task[];
}

export async function createTask(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("tasks").insert({
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    due_date: (formData.get("due_date") as string) || null,
    priority: (formData.get("priority") as string) || "medium",
    status: "open",
    contact_id: (formData.get("contact_id") as string) || null,
    company_id: (formData.get("company_id") as string) || null,
    deal_id: (formData.get("deal_id") as string) || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/aufgaben");
  revalidatePath("/deals");
  revalidatePath("/mein-tag");
  return { error: "" };
}

export async function updateTask(id: string, formData: FormData) {
  const supabase = await createClient();

  const status = (formData.get("status") as string) || undefined;

  const { error } = await supabase
    .from("tasks")
    .update({
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || null,
      due_date: (formData.get("due_date") as string) || null,
      priority: (formData.get("priority") as string) || "medium",
      status: status ?? "open",
      completed_at: status === "completed" ? new Date().toISOString() : status === "open" || status === "waiting" ? null : undefined,
      contact_id: (formData.get("contact_id") as string) || null,
      company_id: (formData.get("company_id") as string) || null,
      deal_id: (formData.get("deal_id") as string) || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/aufgaben");
  revalidatePath("/deals");
  revalidatePath("/mein-tag");
  return { error: "" };
}

export async function completeTask(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/aufgaben");
  revalidatePath("/deals");
  revalidatePath("/mein-tag");
  return { error: "" };
}

export async function reopenTask(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .update({
      status: "open",
      completed_at: null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/aufgaben");
  revalidatePath("/deals");
  revalidatePath("/mein-tag");
  return { error: "" };
}

export async function deleteTask(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/aufgaben");
  revalidatePath("/deals");
  revalidatePath("/mein-tag");
  return { error: "" };
}
