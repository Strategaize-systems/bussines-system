"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type Activity = {
  id: string;
  contact_id: string | null;
  company_id: string | null;
  deal_id: string | null;
  type: string;
  title: string | null;
  description: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
};

export async function getActivities(params: {
  contactId?: string;
  companyId?: string;
  dealId?: string;
}) {
  const supabase = await createClient();

  let query = supabase
    .from("activities")
    .select("*")
    .order("created_at", { ascending: false });

  if (params.contactId) query = query.eq("contact_id", params.contactId);
  if (params.companyId) query = query.eq("company_id", params.companyId);
  if (params.dealId) query = query.eq("deal_id", params.dealId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as Activity[];
}

export async function createActivity(formData: FormData) {
  const supabase = await createClient();

  const contactId = (formData.get("contact_id") as string) || null;
  const companyId = (formData.get("company_id") as string) || null;
  const dealId = (formData.get("deal_id") as string) || null;

  const { error } = await supabase.from("activities").insert({
    contact_id: contactId,
    company_id: companyId,
    deal_id: dealId,
    type: formData.get("type") as string,
    title: (formData.get("title") as string) || null,
    description: (formData.get("description") as string) || null,
    due_date: (formData.get("due_date") as string) || null,
  });

  if (error) return { error: error.message };

  if (contactId) revalidatePath(`/contacts/${contactId}`);
  if (companyId) revalidatePath(`/companies/${companyId}`);
  if (dealId) revalidatePath("/pipeline");
  return { error: "" };
}

export async function completeActivity(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("activities")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/contacts");
  revalidatePath("/companies");
  revalidatePath("/pipeline");
  return { error: "" };
}

export async function deleteActivity(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("activities").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/contacts");
  revalidatePath("/companies");
  revalidatePath("/pipeline");
  return { error: "" };
}
