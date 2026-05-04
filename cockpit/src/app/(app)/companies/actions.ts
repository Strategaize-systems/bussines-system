"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { validateEuVatId } from "@/lib/validation/vat-id";

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
  vat_id: string | null;
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
  source_type: string | null;
  source_detail: string | null;
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

/**
 * Validiert EU-vat_id-Eingabe (DEC-124). Leerer Input = NULL erlaubt.
 * Nicht-leere Eingabe muss EU-Format-konform sein (validateEuVatId).
 */
function sanitizeCompanyVatId(
  value: FormDataEntryValue | null,
): { value: string | null; error: string | null } {
  if (typeof value !== "string") return { value: null, error: null };
  const trimmed = value.trim();
  if (!trimmed) return { value: null, error: null };
  const result = validateEuVatId(trimmed);
  if (!result.valid) {
    return { value: null, error: result.error };
  }
  return { value: result.value, error: null };
}

export async function createCompany(formData: FormData) {
  const supabase = await createClient();

  const tags = (formData.get("tags") as string)
    ?.split(",")
    .map((t) => t.trim())
    .filter(Boolean) ?? [];

  const vatIdResult = sanitizeCompanyVatId(formData.get("vat_id"));
  if (vatIdResult.error) {
    return { error: vatIdResult.error };
  }

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
    vat_id: vatIdResult.value,
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
    source_type: (formData.get("source_type") as string) || null,
    source_detail: (formData.get("source_detail") as string) || null,
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

  const vatIdResult = sanitizeCompanyVatId(formData.get("vat_id"));
  if (vatIdResult.error) {
    return { error: vatIdResult.error };
  }

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
      vat_id: vatIdResult.value,
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
      source_type: (formData.get("source_type") as string) || null,
      source_detail: (formData.get("source_detail") as string) || null,
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

export type CompanyStats = {
  total: number;
  pipelineValue: number;
  totalPotential: number;
  kundenCount: number;
};

export async function getCompanyStats(): Promise<CompanyStats> {
  const supabase = await createClient();

  const [companiesResult, dealsResult, kundenResult] = await Promise.all([
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("deals").select("value").eq("status", "active"),
    supabase.from("deals").select("id", { count: "exact", head: true }).eq("status", "won"),
  ]);

  const pipelineValue = (dealsResult.data || []).reduce(
    (sum, d) => sum + (d.value ?? 0),
    0
  );

  // Estimate potential as pipeline + 3x (rough heuristic)
  const totalPotential = pipelineValue * 3;

  return {
    total: companiesResult.count ?? 0,
    pipelineValue,
    totalPotential,
    kundenCount: kundenResult.count ?? 0,
  };
}

export type CompanyEnriched = Company & {
  contactName: string | null;
  pipelineValue: number;
  lastActivity: string | null;
  region: string | null;
};

function plzToRegion(plz: string | null): string | null {
  if (!plz) return null;
  const first = parseInt(plz.charAt(0), 10);
  if (first <= 1) return "Ost";
  if (first === 2) return "Nord";
  if (first <= 4) return "West";
  if (first <= 6) return "West";
  if (first === 7) return "Süd-West";
  if (first === 8) return "Süd";
  return "Süd-Ost";
}

export async function getCompaniesEnriched(): Promise<CompanyEnriched[]> {
  const supabase = await createClient();

  const [companiesResult, dealsResult, contactsResult] = await Promise.all([
    supabase.from("companies").select("*").order("created_at", { ascending: false }),
    supabase.from("deals").select("company_id, value, status"),
    supabase.from("contacts").select("company_id, first_name, last_name").order("created_at", { ascending: false }),
  ]);

  const companies = (companiesResult.data || []) as Company[];
  const deals = dealsResult.data || [];
  const contacts = contactsResult.data || [];

  return companies.map((c) => {
    const companyDeals = deals.filter((d) => d.company_id === c.id && d.status === "active");
    const pipelineValue = companyDeals.reduce((sum, d) => sum + (d.value ?? 0), 0);
    const contact = contacts.find((ct) => ct.company_id === c.id);
    const contactName = contact ? `${contact.first_name} ${contact.last_name}`.trim() : null;

    return {
      ...c,
      contactName,
      pipelineValue,
      lastActivity: null,
      region: plzToRegion(c.address_zip),
    };
  });
}

export type CompanyDeal = {
  id: string;
  title: string;
  value: number | null;
  status: string;
  expected_close_date: string | null;
  created_at: string;
  contacts: { id: string; first_name: string; last_name: string } | null;
  pipeline_stages: { name: string } | null;
};

type CompanyDealRaw = Omit<CompanyDeal, "contacts" | "pipeline_stages"> & {
  contacts: { id: string; first_name: string; last_name: string }[] | { id: string; first_name: string; last_name: string } | null;
  pipeline_stages: { name: string }[] | { name: string } | null;
};

export async function getDealsByCompany(companyId: string): Promise<CompanyDeal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select("id, title, value, status, expected_close_date, created_at, contacts(id, first_name, last_name), pipeline_stages(name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as CompanyDealRaw[]).map((d) => ({
    ...d,
    contacts: Array.isArray(d.contacts) ? d.contacts[0] ?? null : d.contacts,
    pipeline_stages: Array.isArray(d.pipeline_stages) ? d.pipeline_stages[0] ?? null : d.pipeline_stages,
  }));
}

export async function getCompaniesForSelect() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, address_zip")
    .order("name");

  if (error) throw new Error(error.message);
  return data as { id: string; name: string; address_zip: string | null }[];
}
