"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type Handoff = {
  id: string;
  deal_id: string | null;
  company_id: string | null;
  entry_track: string | null;
  contacts_transferring: string | null;
  pre_information: string | null;
  conversation_insights: string | null;
  expectations: string | null;
  documents_included: string | null;
  status: string;
  handed_off_at: string | null;
  created_at: string;
  deals?: { id: string; title: string } | null;
  companies?: { id: string; name: string } | null;
};

export async function getHandoffs() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("handoffs")
    .select("*, deals(id, title), companies(id, name)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Handoff[];
}

export async function createHandoff(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("handoffs").insert({
    deal_id: (formData.get("deal_id") as string) || null,
    company_id: (formData.get("company_id") as string) || null,
    entry_track: (formData.get("entry_track") as string) || null,
    contacts_transferring: (formData.get("contacts_transferring") as string) || null,
    pre_information: (formData.get("pre_information") as string) || null,
    conversation_insights: (formData.get("conversation_insights") as string) || null,
    expectations: (formData.get("expectations") as string) || null,
    documents_included: (formData.get("documents_included") as string) || null,
    status: "pending",
  });

  if (error) return { error: error.message };

  revalidatePath("/handoffs");
  return { error: "" };
}

export async function updateHandoffStatus(id: string, status: string) {
  const supabase = await createClient();

  const update: Record<string, unknown> = { status };
  if (status === "completed") update.handed_off_at = new Date().toISOString();

  const { error } = await supabase
    .from("handoffs")
    .update(update)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/handoffs");
  return { error: "" };
}

export async function deleteHandoff(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("handoffs").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/handoffs");
  return { error: "" };
}
