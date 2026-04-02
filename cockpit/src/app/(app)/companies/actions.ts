"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type Company = {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  address_street: string | null;
  address_city: string | null;
  address_zip: string | null;
  address_country: string | null;
  notes: string | null;
  tags: string[];
  exit_relevance: string | null;
  ai_readiness: string | null;
  ownership_structure: string | null;
  decision_maker_access: boolean;
  budget_potential: string | null;
  complexity_fit: boolean;
  willingness: boolean;
  champion_potential: boolean;
  strategic_relevance: string | null;
  blueprint_fit: string | null;
  employee_count: string | null;
  revenue_range: string | null;
  created_at: string;
  updated_at: string;
};

export async function getCompanies(search?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,industry.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as Company[];
}

export async function getCompany(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data as Company;
}

export async function getCompanyContacts(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email, position, tags")
    .eq("company_id", companyId)
    .order("last_name");

  if (error) throw new Error(error.message);
  return data;
}

export async function createCompany(formData: FormData) {
  const supabase = await createClient();

  const tags = (formData.get("tags") as string)
    ?.split(",")
    .map((t) => t.trim())
    .filter(Boolean) ?? [];

  const { error } = await supabase.from("companies").insert({
    name: formData.get("name") as string,
    industry: (formData.get("industry") as string) || null,
    website: (formData.get("website") as string) || null,
    email: (formData.get("email") as string) || null,
    phone: (formData.get("phone") as string) || null,
    address_street: (formData.get("address_street") as string) || null,
    address_city: (formData.get("address_city") as string) || null,
    address_zip: (formData.get("address_zip") as string) || null,
    address_country: (formData.get("address_country") as string) || null,
    tags,
    notes: (formData.get("notes") as string) || null,
    exit_relevance: (formData.get("exit_relevance") as string) || null,
    ai_readiness: (formData.get("ai_readiness") as string) || null,
    ownership_structure: (formData.get("ownership_structure") as string) || null,
    decision_maker_access: formData.get("decision_maker_access") === "on",
    budget_potential: (formData.get("budget_potential") as string) || null,
    complexity_fit: formData.get("complexity_fit") === "on",
    willingness: formData.get("willingness") === "on",
    champion_potential: formData.get("champion_potential") === "on",
    strategic_relevance: (formData.get("strategic_relevance") as string) || null,
    blueprint_fit: (formData.get("blueprint_fit") as string) || null,
    employee_count: (formData.get("employee_count") as string) || null,
    revenue_range: (formData.get("revenue_range") as string) || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/companies");
  return { error: "" };
}

export async function updateCompany(id: string, formData: FormData) {
  const supabase = await createClient();

  const tags = (formData.get("tags") as string)
    ?.split(",")
    .map((t) => t.trim())
    .filter(Boolean) ?? [];

  const { error } = await supabase
    .from("companies")
    .update({
      name: formData.get("name") as string,
      industry: (formData.get("industry") as string) || null,
      website: (formData.get("website") as string) || null,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      address_street: (formData.get("address_street") as string) || null,
      address_city: (formData.get("address_city") as string) || null,
      address_zip: (formData.get("address_zip") as string) || null,
      address_country: (formData.get("address_country") as string) || null,
      tags,
      notes: (formData.get("notes") as string) || null,
      exit_relevance: (formData.get("exit_relevance") as string) || null,
      ai_readiness: (formData.get("ai_readiness") as string) || null,
      ownership_structure: (formData.get("ownership_structure") as string) || null,
      decision_maker_access: formData.get("decision_maker_access") === "on",
      budget_potential: (formData.get("budget_potential") as string) || null,
      complexity_fit: formData.get("complexity_fit") === "on",
      willingness: formData.get("willingness") === "on",
      champion_potential: formData.get("champion_potential") === "on",
      strategic_relevance: (formData.get("strategic_relevance") as string) || null,
      blueprint_fit: (formData.get("blueprint_fit") as string) || null,
      employee_count: (formData.get("employee_count") as string) || null,
      revenue_range: (formData.get("revenue_range") as string) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`);
  return { error: "" };
}

export async function deleteCompany(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("companies").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/companies");
  return { error: "" };
}

export async function getCompaniesForSelect() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id, name")
    .order("name");

  if (error) throw new Error(error.message);
  return data as { id: string; name: string }[];
}
