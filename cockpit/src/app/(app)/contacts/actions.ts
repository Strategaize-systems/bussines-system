"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type Contact = {
  id: string;
  company_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  linkedin_url: string | null;
  tags: string[];
  notes: string | null;
  relationship_type: string | null;
  role_in_process: string | null;
  source: string | null;
  language: string | null;
  region: string | null;
  trust_level: string | null;
  referral_capability: string | null;
  is_multiplier: boolean;
  multiplier_type: string | null;
  last_interaction_date: string | null;
  meeting_link: string | null;
  created_at: string;
  updated_at: string;
  companies?: { id: string; name: string } | null;
};

export async function getContacts(search?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("contacts")
    .select("*, companies(id, name)")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as Contact[];
}

export async function getContact(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*, companies(id, name)")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data as Contact;
}

export async function createContact(formData: FormData) {
  const supabase = await createClient();

  const tags = (formData.get("tags") as string)
    ?.split(",")
    .map((t) => t.trim())
    .filter(Boolean) ?? [];

  const { error } = await supabase.from("contacts").insert({
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    email: (formData.get("email") as string) || null,
    phone: (formData.get("phone") as string) || null,
    position: (formData.get("position") as string) || null,
    linkedin_url: (formData.get("linkedin_url") as string) || null,
    company_id: (formData.get("company_id") as string) || null,
    tags,
    notes: (formData.get("notes") as string) || null,
    relationship_type: (formData.get("relationship_type") as string) || null,
    role_in_process: (formData.get("role_in_process") as string) || null,
    source: (formData.get("source") as string) || null,
    language: (formData.get("language") as string) || "de",
    region: (formData.get("region") as string) || null,
    trust_level: (formData.get("trust_level") as string) || null,
    referral_capability: (formData.get("referral_capability") as string) || null,
    is_multiplier: formData.get("is_multiplier") === "on",
    multiplier_type: (formData.get("multiplier_type") as string) || null,
    meeting_link: (formData.get("meeting_link") as string) || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/contacts");
  return { error: "" };
}

export async function updateContact(id: string, formData: FormData) {
  const supabase = await createClient();

  const tags = (formData.get("tags") as string)
    ?.split(",")
    .map((t) => t.trim())
    .filter(Boolean) ?? [];

  const { error } = await supabase
    .from("contacts")
    .update({
      first_name: formData.get("first_name") as string,
      last_name: formData.get("last_name") as string,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      position: (formData.get("position") as string) || null,
      linkedin_url: (formData.get("linkedin_url") as string) || null,
      company_id: (formData.get("company_id") as string) || null,
      tags,
      notes: (formData.get("notes") as string) || null,
      relationship_type: (formData.get("relationship_type") as string) || null,
      role_in_process: (formData.get("role_in_process") as string) || null,
      source: (formData.get("source") as string) || null,
      language: (formData.get("language") as string) || "de",
      region: (formData.get("region") as string) || null,
      trust_level: (formData.get("trust_level") as string) || null,
      referral_capability: (formData.get("referral_capability") as string) || null,
      is_multiplier: formData.get("is_multiplier") === "on",
      multiplier_type: (formData.get("multiplier_type") as string) || null,
      meeting_link: (formData.get("meeting_link") as string) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  return { error: "" };
}

export async function deleteContact(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("contacts").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/contacts");
  return { error: "" };
}

export async function getMultipliers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*, companies(id, name)")
    .eq("is_multiplier", true)
    .order("last_name");

  if (error) throw new Error(error.message);
  return data as Contact[];
}

export async function getContactsForSelect() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("id, first_name, last_name")
    .order("last_name");

  if (error) throw new Error(error.message);
  return data as { id: string; first_name: string; last_name: string }[];
}
