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
  // V5.5 MIG-026 additions (alle nullable, V2-Stub-Rows behalten NULL)
  subtotal_net: number | null;
  tax_rate: number;
  tax_amount: number | null;
  total_gross: number | null;
  valid_until: string | null;
  payment_terms: string | null;
  parent_proposal_id: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  expired_at: string | null;
  pdf_storage_path: string | null;
  deals?: { id: string; title: string } | null;
  contacts?: { id: string; first_name: string; last_name: string } | null;
  companies?: { id: string; name: string } | null;
};

export type ProposalItem = {
  id: string;
  proposal_id: string;
  product_id: string | null;
  position_order: number;
  quantity: number;
  unit_price_net: number;
  discount_pct: number;
  snapshot_name: string;
  snapshot_description: string | null;
  snapshot_unit_price_at_creation: number | null;
  created_at: string;
};

export type ProposalEditPayload = {
  proposal: Proposal;
  items: ProposalItem[];
  branding: {
    logo_url: string | null;
    primary_color: string | null;
    secondary_color: string | null;
    font_family: string | null;
    footer_markdown: string | null;
    contact_block: unknown;
  } | null;
  deal: { id: string; title: string } | null;
  company: { id: string; name: string } | null;
  contact: { id: string; first_name: string; last_name: string } | null;
};

const DEFAULT_PAYMENT_TERMS = "30 Tage netto";
const DEFAULT_VALID_UNTIL_DAYS = 30;

export async function getProposals() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposals")
    .select("*, deals(id, title), contacts(id, first_name, last_name), companies(id, name)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Proposal[];
}

export async function getProposalsForContact(contactId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposals")
    .select("*, deals(id, title)")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Proposal[];
}

export async function getProposalsForCompany(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposals")
    .select("*, deals(id, title)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Proposal[];
}

// V2-Stub: FormData-basierter Trigger fuer das alte ProposalSheet ("Neues Angebot"-
// Modal in /proposals). Bleibt bis SLC-552 die neue Workspace-Route ausrollt.
// V5.5 (MIG-026) hat nur additive Spalten dazugepackt; die V2-Logik (auto-increment
// version pro Deal) funktioniert weiterhin gegen das erweiterte Schema.
export async function createProposalLegacy(formData: FormData) {
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

// V5.5 SLC-551: Einstiegspunkt-Trigger fuer SLC-552-Workspace ("Angebot
// erstellen" aus Quickaction/Pipeline/Deal-Detail). Legt einen leeren Draft
// ohne Position-Items an — User fuegt Items im Workspace hinzu.
// Audit-Eintrag entry_type='proposal' fuer Audit-Trail.
export type CreateProposalInput = {
  deal_id: string;
  contact_id?: string | null;
  company_id?: string | null;
  title?: string;
};

export type CreateProposalResult =
  | { ok: true; proposalId: string }
  | { ok: false; error: string };

export async function createProposal(
  input: CreateProposalInput,
): Promise<CreateProposalResult> {
  const supabase = await createClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return { ok: false, error: "Nicht angemeldet." };
  }
  const userId = userData.user.id;

  if (!input.deal_id) {
    return { ok: false, error: "deal_id ist Pflicht." };
  }

  // Branding-Default fuer payment_terms (Spalte existiert in V5.3 noch nicht
  // explizit als payment_terms_default — Fallback auf "30 Tage netto").
  const paymentTerms = DEFAULT_PAYMENT_TERMS;

  // valid_until = today + 30 Tage als ISO-Date (yyyy-mm-dd).
  const validUntil = new Date(Date.now() + DEFAULT_VALID_UNTIL_DAYS * 86400000)
    .toISOString()
    .slice(0, 10);

  const today = new Date().toISOString().slice(0, 10);
  const title = input.title ?? `Angebot ${today}`;

  const { data: inserted, error: insertErr } = await supabase
    .from("proposals")
    .insert({
      deal_id: input.deal_id,
      contact_id: input.contact_id ?? null,
      company_id: input.company_id ?? null,
      title,
      version: 1,
      status: "draft",
      tax_rate: 19.0,
      valid_until: validUntil,
      payment_terms: paymentTerms,
      parent_proposal_id: null,
      created_by: userId,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return { ok: false, error: insertErr?.message ?? "INSERT proposals fehlgeschlagen." };
  }

  // Audit-Trail (DEC-024). Best-effort: Audit-Fehler darf den Proposal-Create
  // nicht zurueckdrehen — Audit-Lueke ist akzeptabel, doppelter Insert nicht.
  await supabase.from("audit_log").insert({
    actor_id: userId,
    action: "create",
    entity_type: "proposal",
    entity_id: inserted.id,
    context: "Created from deal/pipeline",
  });

  revalidatePath("/proposals");
  if (input.deal_id) revalidatePath(`/deals/${input.deal_id}`);

  return { ok: true, proposalId: inserted.id };
}

// V5.5 SLC-551: Workspace-Loader fuer /proposals/[id]/edit (SLC-552).
// Sammelt Proposal + Items + Branding + Deal + Company + Contact in einem
// einzigen Server-Roundtrip via Promise.all. Liefert null wenn der Proposal
// nicht existiert (Workspace-Page rendert dann 404).
export async function getProposalForEdit(
  proposalId: string,
): Promise<ProposalEditPayload | null> {
  const supabase = await createClient();

  const { data: proposal, error: pErr } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", proposalId)
    .maybeSingle();

  if (pErr || !proposal) return null;

  const [itemsRes, brandingRes, dealRes, companyRes, contactRes] = await Promise.all([
    supabase
      .from("proposal_items")
      .select("*")
      .eq("proposal_id", proposalId)
      .order("position_order", { ascending: true }),
    supabase
      .from("branding_settings")
      .select("logo_url, primary_color, secondary_color, font_family, footer_markdown, contact_block")
      .limit(1)
      .maybeSingle(),
    proposal.deal_id
      ? supabase.from("deals").select("id, title").eq("id", proposal.deal_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    proposal.company_id
      ? supabase.from("companies").select("id, name").eq("id", proposal.company_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    proposal.contact_id
      ? supabase
          .from("contacts")
          .select("id, first_name, last_name")
          .eq("id", proposal.contact_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  return {
    proposal: proposal as Proposal,
    items: (itemsRes.data ?? []) as ProposalItem[],
    branding: (brandingRes.data ?? null) as ProposalEditPayload["branding"],
    deal: (dealRes.data ?? null) as ProposalEditPayload["deal"],
    company: (companyRes.data ?? null) as ProposalEditPayload["company"],
    contact: (contactRes.data ?? null) as ProposalEditPayload["contact"],
  };
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
