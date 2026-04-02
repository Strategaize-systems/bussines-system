"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type Proposal = {
  id: string;
  deal_id: string | null;
  company_id: string | null;
  contact_id: string | null;
  title: string;
  version: number;
  status: string;
  scope_notes: string | null;
  price_range: string | null;
  objections: string | null;
  negotiation_notes: string | null;
  won_lost_reason: string | null;
  won_lost_details: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  deals?: { id: string; title: string } | null;
  contacts?: { id: string; first_name: string; last_name: string } | null;
  companies?: { id: string; name: string } | null;
};

export async function getProposals() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposals")
    .select("*, deals(id, title), contacts(id, first_name, last_name), companies(id, name)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Proposal[];
}

export async function createProposal(formData: FormData) {
  const supabase = await createClient();

  const dealId = (formData.get("deal_id") as string) || null;

  // Auto-increment version for same deal
  let version = 1;
  if (dealId) {
    const { data: existing } = await supabase
      .from("proposals")
      .select("version")
      .eq("deal_id", dealId)
      .order("version", { ascending: false })
      .limit(1);
    if (existing?.[0]) version = existing[0].version + 1;
  }

  const { error } = await supabase.from("proposals").insert({
    deal_id: dealId,
    company_id: (formData.get("company_id") as string) || null,
    contact_id: (formData.get("contact_id") as string) || null,
    title: formData.get("title") as string,
    version,
    status: "draft",
    scope_notes: (formData.get("scope_notes") as string) || null,
    price_range: (formData.get("price_range") as string) || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/proposals");
  return { error: "" };
}

export async function updateProposal(id: string, formData: FormData) {
  const supabase = await createClient();

  const status = formData.get("status") as string;

  const { error } = await supabase
    .from("proposals")
    .update({
      title: formData.get("title") as string,
      status,
      scope_notes: (formData.get("scope_notes") as string) || null,
      price_range: (formData.get("price_range") as string) || null,
      objections: (formData.get("objections") as string) || null,
      negotiation_notes: (formData.get("negotiation_notes") as string) || null,
      won_lost_reason: status === "won" || status === "lost" ? (formData.get("won_lost_reason") as string) || null : null,
      won_lost_details: status === "won" || status === "lost" ? (formData.get("won_lost_details") as string) || null : null,
      sent_at: status === "sent" && !formData.get("sent_at") ? new Date().toISOString() : undefined,
      company_id: (formData.get("company_id") as string) || null,
      contact_id: (formData.get("contact_id") as string) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/proposals");
  return { error: "" };
}

export async function deleteProposal(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("proposals").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/proposals");
  return { error: "" };
}
