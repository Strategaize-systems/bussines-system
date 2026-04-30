"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import {
  proposalEditSchema,
  proposalItemUpdateSchema,
  type ProposalItemUpdateInput,
} from "@/lib/proposal/zod-schemas";
import { calculateTotals } from "@/lib/proposal/calc";
import {
  isValidTransition,
  type ProposalStatus,
} from "@/lib/proposal/transitions";
import {
  getProposalPdfPath,
  PROPOSAL_PDF_BUCKET,
} from "@/lib/pdf/proposal-pdf-path";
import { pdfmakeRenderer } from "@/lib/pdf/proposal-renderer";
import { getLogoDataUrl } from "@/lib/pdf/image-helper";

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

// V2-Stub: FormData-basierter Edit-Trigger fuer das alte ProposalSheet (Edit
// im /proposals-Listing). V5.5 SLC-552 fuehrt updateProposal(id, patch) als
// Workspace-Action ein — daher hier "Legacy"-Suffix analog createProposalLegacy.
export async function updateProposalLegacy(id: string, formData: FormData) {
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

// =====================================================================
// V5.5 SLC-552 — Workspace Server Actions
// =====================================================================
// Patch-basierte Updates fuer den /proposals/[id]/edit Workspace.
// Auto-Save (debounced 500ms im Frontend) ruft updateProposal mit nur
// den geaenderten Feldern. Audit-Eintrag nur bei nicht-trivialen
// Aenderungen (title/tax_rate/valid_until/payment_terms) — Notes-Edits
// schreiben keinen Audit-Eintrag (zu viel Noise bei Auto-Save).

export type MutationResult = { ok: true } | { ok: false; error: string };

export type ItemMutationResult =
  | { ok: true; itemId: string }
  | { ok: false; error: string };

export type AddItemResult =
  | { ok: true; item: ProposalItem }
  | { ok: false; error: string };

const AUDIT_RELEVANT_FIELDS = [
  "title",
  "tax_rate",
  "valid_until",
  "payment_terms",
] as const;

type ProposalUpdatePatch = {
  title?: string;
  tax_rate?: 0 | 7 | 19;
  valid_until?: string | null;
  payment_terms?: string | null;
  contact_id?: string | null;
  company_id?: string | null;
};

// V5.5 SLC-554 — Read-only-Mode Server-Side-Guard.
// `?readonly=1` im Workspace-URL ist nur UX. Der echte Schutz: nicht-Draft
// Proposals duerfen ihre Felder/Items nicht mehr aendern. Wird in jeder
// Mutate-Action vor der DB-Write-Operation gerufen.
async function assertProposalEditable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  proposalId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("proposals")
    .select("status")
    .eq("id", proposalId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Angebot nicht gefunden." };
  if (data.status !== "draft") {
    return {
      ok: false,
      error: "Angebot ist eingefroren — nur Drafts sind editierbar.",
    };
  }
  return { ok: true };
}

export async function updateProposal(
  proposalId: string,
  patch: ProposalUpdatePatch,
): Promise<MutationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  const parsed = proposalEditSchema.partial().safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Validierung fehlgeschlagen." };
  }

  const { data: before } = await supabase
    .from("proposals")
    .select("status, title, tax_rate, valid_until, payment_terms")
    .eq("id", proposalId)
    .maybeSingle();

  if (!before) return { ok: false, error: "Angebot nicht gefunden." };
  if (before.status !== "draft") {
    return { ok: false, error: "Angebot ist eingefroren — nur Drafts sind editierbar." };
  }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    ...parsed.data,
  };

  const { error } = await supabase
    .from("proposals")
    .update(update)
    .eq("id", proposalId);

  if (error) return { ok: false, error: error.message };

  const auditChanges: Record<string, { before: unknown; after: unknown }> = {};
  for (const field of AUDIT_RELEVANT_FIELDS) {
    if (
      field in parsed.data &&
      (before as Record<string, unknown>)[field] !==
        (parsed.data as Record<string, unknown>)[field]
    ) {
      auditChanges[field] = {
        before: (before as Record<string, unknown>)[field],
        after: (parsed.data as Record<string, unknown>)[field],
      };
    }
  }
  if (Object.keys(auditChanges).length > 0) {
    void logAudit({
      action: "update",
      entityType: "proposal",
      entityId: proposalId,
      changes: { before: auditChanges, after: auditChanges },
      context: "Workspace Auto-Save",
    });
  }

  revalidatePath(`/proposals/${proposalId}/edit`);
  revalidatePath("/proposals");
  return { ok: true };
}

export async function addProposalItem(
  proposalId: string,
  productId: string,
  quantity: number = 1,
): Promise<AddItemResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  const guard = await assertProposalEditable(supabase, proposalId);
  if (!guard.ok) return guard;

  if (quantity <= 0) return { ok: false, error: "Menge muss > 0 sein." };

  const { data: product, error: pErr } = await supabase
    .from("products")
    .select("id, name, description, standard_price, status")
    .eq("id", productId)
    .maybeSingle();

  if (pErr || !product) return { ok: false, error: "Produkt nicht gefunden." };
  if (product.status !== "active") {
    return { ok: false, error: "Produkt ist nicht aktiv." };
  }

  const { data: maxRow } = await supabase
    .from("proposal_items")
    .select("position_order")
    .eq("proposal_id", proposalId)
    .order("position_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxRow?.position_order ?? 0) + 1;
  const standardPrice = (product.standard_price as number | null) ?? 0;

  const { data: inserted, error: insErr } = await supabase
    .from("proposal_items")
    .insert({
      proposal_id: proposalId,
      product_id: product.id,
      position_order: nextOrder,
      quantity,
      unit_price_net: standardPrice,
      discount_pct: 0,
      snapshot_name: product.name as string,
      snapshot_description: (product.description as string | null) ?? null,
      snapshot_unit_price_at_creation: standardPrice,
    })
    .select("*")
    .single();

  if (insErr || !inserted) {
    return { ok: false, error: insErr?.message ?? "INSERT proposal_item fehlgeschlagen." };
  }

  void logAudit({
    action: "create",
    entityType: "proposal",
    entityId: proposalId,
    context: `Item hinzugefuegt: ${product.name}`,
  });

  revalidatePath(`/proposals/${proposalId}/edit`);
  return { ok: true, item: inserted as ProposalItem };
}

export async function updateProposalItem(
  itemId: string,
  patch: ProposalItemUpdateInput,
): Promise<MutationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  const parsed = proposalItemUpdateSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Validierung fehlgeschlagen." };
  }

  const { data: before } = await supabase
    .from("proposal_items")
    .select("proposal_id")
    .eq("id", itemId)
    .maybeSingle();

  if (!before) return { ok: false, error: "Position nicht gefunden." };

  const guard = await assertProposalEditable(supabase, before.proposal_id as string);
  if (!guard.ok) return guard;

  const { error } = await supabase
    .from("proposal_items")
    .update(parsed.data)
    .eq("id", itemId);

  if (error) return { ok: false, error: error.message };

  void logAudit({
    action: "update",
    entityType: "proposal",
    entityId: before.proposal_id as string,
    context: "Position aktualisiert",
  });

  revalidatePath(`/proposals/${before.proposal_id}/edit`);
  return { ok: true };
}

export async function removeProposalItem(itemId: string): Promise<MutationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  const { data: before } = await supabase
    .from("proposal_items")
    .select("proposal_id, snapshot_name")
    .eq("id", itemId)
    .maybeSingle();

  if (!before) return { ok: false, error: "Position nicht gefunden." };

  const guard = await assertProposalEditable(supabase, before.proposal_id as string);
  if (!guard.ok) return guard;

  const { error } = await supabase
    .from("proposal_items")
    .delete()
    .eq("id", itemId);

  if (error) return { ok: false, error: error.message };

  void logAudit({
    action: "delete",
    entityType: "proposal",
    entityId: before.proposal_id as string,
    context: `Position entfernt: ${before.snapshot_name}`,
  });

  revalidatePath(`/proposals/${before.proposal_id}/edit`);
  return { ok: true };
}

// Reorder per Drag&Drop. Supabase JS hat keine native Tx-API, also schreiben
// wir sequenziell — bei Fehler in der Mitte bleibt der Zwischenstand inkonsistent
// (akzeptierter Tradeoff fuer V5.5: UI sperrt waehrend des Calls und reload-t
// bei Error). Idempotent: erneute Aufrufe mit gleichem orderedItemIds setzen
// position_order auf identische Werte.
export async function reorderProposalItems(
  proposalId: string,
  orderedItemIds: string[],
): Promise<MutationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  if (!Array.isArray(orderedItemIds) || orderedItemIds.length === 0) {
    return { ok: false, error: "Keine Items zum Sortieren." };
  }

  const guard = await assertProposalEditable(supabase, proposalId);
  if (!guard.ok) return guard;

  for (let i = 0; i < orderedItemIds.length; i++) {
    const { error } = await supabase
      .from("proposal_items")
      .update({ position_order: i + 1 })
      .eq("id", orderedItemIds[i])
      .eq("proposal_id", proposalId);

    if (error) {
      return { ok: false, error: `Reorder fehlgeschlagen bei Position ${i + 1}: ${error.message}` };
    }
  }

  void logAudit({
    action: "update",
    entityType: "proposal",
    entityId: proposalId,
    context: "Positionen neu sortiert (Drag&Drop)",
  });

  revalidatePath(`/proposals/${proposalId}/edit`);
  return { ok: true };
}

// =====================================================================
// V5.5 SLC-553 — PDF-Generierung
// =====================================================================
// Server-side PDF-Renderer (pdfmake, DEC-105). Schreibt PDF in den
// proposal-pdfs-Storage-Bucket unter `{user_id}/{proposal_id}/v{version}[.testmode].pdf`,
// persistiert Pfad in `proposals.pdf_storage_path`, returnt Signed-URL fuer
// iframe-Anzeige. Nur Status `draft` oder `sent` darf rendern. Berechnung
// (subtotal/tax/total) wird beim Generate persistiert. Audit-Eintrag pro Run.

export type GenerateProposalPdfResult =
  | { ok: true; pdfUrl: string; filename: string }
  | { ok: false; error: string };

export async function generateProposalPdf(
  proposalId: string,
): Promise<GenerateProposalPdfResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, error: "Nicht angemeldet." };
  }
  const userId = user.id;

  if (!proposalId) {
    return { ok: false, error: "proposalId ist Pflicht." };
  }

  const { data: proposal, error: pErr } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", proposalId)
    .maybeSingle();

  if (pErr || !proposal) {
    return { ok: false, error: "Angebot nicht gefunden." };
  }

  if (proposal.status !== "draft" && proposal.status !== "sent") {
    return {
      ok: false,
      error: `PDF-Generierung ist im Status "${proposal.status}" nicht erlaubt.`,
    };
  }

  const [itemsRes, brandingRes, dealRes, companyRes, contactRes] =
    await Promise.all([
      supabase
        .from("proposal_items")
        .select("*")
        .eq("proposal_id", proposalId)
        .order("position_order", { ascending: true }),
      supabase
        .from("branding_settings")
        .select(
          "logo_url, primary_color, secondary_color, font_family, footer_markdown, contact_block",
        )
        .limit(1)
        .maybeSingle(),
      proposal.deal_id
        ? supabase
            .from("deals")
            .select("id, title")
            .eq("id", proposal.deal_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      proposal.company_id
        ? supabase
            .from("companies")
            .select("id, name")
            .eq("id", proposal.company_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      proposal.contact_id
        ? supabase
            .from("contacts")
            .select("id, first_name, last_name")
            .eq("id", proposal.contact_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

  const items = (itemsRes.data ?? []) as ProposalItem[];
  const branding = (brandingRes.data ?? null) as ProposalEditPayload["branding"];
  const deal = (dealRes.data ?? null) as ProposalEditPayload["deal"];
  const company = (companyRes.data ?? null) as ProposalEditPayload["company"];
  const contact = (contactRes.data ?? null) as ProposalEditPayload["contact"];

  const taxRate = proposal.tax_rate ?? 19;
  const totals = calculateTotals(items, taxRate);

  const { error: updErr } = await supabase
    .from("proposals")
    .update({
      subtotal_net: totals.subtotal,
      tax_amount: totals.tax,
      total_gross: totals.total,
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposalId);

  if (updErr) {
    return {
      ok: false,
      error: `Berechnungs-Persistierung fehlgeschlagen: ${updErr.message}`,
    };
  }

  // Test-Mode default true bis V5.6 Production-Gate explizit ausschaltet.
  const testMode = process.env.INTERNAL_TEST_MODE_ACTIVE !== "false";

  const admin = createAdminClient();

  let logoDataUrl: string | null = null;
  if (branding?.logo_url) {
    logoDataUrl = await getLogoDataUrl(admin);
  }

  const t0 = Date.now();
  let renderResult: Awaited<
    ReturnType<typeof pdfmakeRenderer.renderProposalPdf>
  >;
  try {
    renderResult = await pdfmakeRenderer.renderProposalPdf({
      proposal: proposal as Proposal,
      items,
      branding,
      deal,
      company,
      contact,
      logoDataUrl,
      testMode,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Renderer-Fehler.";
    return { ok: false, error: `PDF-Rendering fehlgeschlagen: ${msg}` };
  }
  const renderMs = Date.now() - t0;
  console.log(
    `[generateProposalPdf] proposal=${proposalId} version=${proposal.version} items=${items.length} render_ms=${renderMs}`,
  );

  const path = getProposalPdfPath(
    userId,
    proposalId,
    proposal.version,
    testMode,
  );

  const { error: upErr } = await admin.storage
    .from(PROPOSAL_PDF_BUCKET)
    .upload(path, renderResult.buffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (upErr) {
    return {
      ok: false,
      error: `Storage-Upload fehlgeschlagen: ${upErr.message}`,
    };
  }

  const { error: pathErr } = await supabase
    .from("proposals")
    .update({ pdf_storage_path: path })
    .eq("id", proposalId);

  if (pathErr) {
    console.warn(
      `[generateProposalPdf] pdf_storage_path-UPDATE fehlgeschlagen: ${pathErr.message}`,
    );
  }

  // Audit-Eintrag direkt (nicht via logAudit-Helper) — wir kennen userId und
  // wollen keine zusaetzliche Auth-Roundtrip-Latenz im Hot-Path.
  await supabase.from("audit_log").insert({
    actor_id: userId,
    action: "update",
    entity_type: "proposal",
    entity_id: proposalId,
    context: `PDF generated v${proposal.version}`,
  });

  // Server-Proxy-Route nutzen statt createSignedUrl (Hotfix 2026-04-30):
  // Self-Hosted-Supabase ist via Kong extern nicht erreichbar — Signed-URLs
  // zeigen auf den internen Container-Hostname und brechen im Browser. Die
  // Proxy-Route streamt das PDF inline mit Auth-Check + sauberem Filename.
  // Cache-Buster `v={version}-{timestamp}` damit der iframe nach erneuter
  // Generierung nicht aus dem Browser-Cache laedt.
  const cacheBuster = `${proposal.version}-${Date.now()}`;
  const pdfUrl = `/api/proposals/${proposalId}/pdf?v=${cacheBuster}`;

  revalidatePath(`/proposals/${proposalId}/edit`);

  return {
    ok: true,
    pdfUrl,
    filename: renderResult.filename,
  };
}

// =====================================================================
// V5.5 SLC-554 — Status-Lifecycle + Versionierung + Auto-Expire
// =====================================================================
// Whitelist-gekapselte Status-Transitions (DEC-108 idempotent), Versions-
// Erstellung mit Item-Snapshot-Kopie (DEC-109 V1-Status unangetastet),
// Auto-Expire-Cron (DEC-110 02:00 Berlin). Alle Aktionen schreiben einen
// Audit-Eintrag mit `actor_id=auth.uid()` (manuell) oder `actor_id=NULL`
// (Cron). Whitelist liegt in `lib/proposal/transitions.ts`.

export type TransitionResult = { ok: true } | { ok: false; error: string };

export type CreateVersionResult =
  | { ok: true; newProposalId: string }
  | { ok: false; error: string };

export type ProposalVersionEntry = {
  id: string;
  version: number;
  status: string;
  parent_proposal_id: string | null;
  created_at: string;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  expired_at: string | null;
};

const TRANSITION_TIMESTAMP_FIELD: Record<
  Exclude<ProposalStatus, "draft">,
  "sent_at" | "accepted_at" | "rejected_at" | "expired_at"
> = {
  sent: "sent_at",
  accepted: "accepted_at",
  rejected: "rejected_at",
  expired: "expired_at",
};

export async function transitionProposalStatus(
  proposalId: string,
  newStatus: Exclude<ProposalStatus, "draft">,
): Promise<TransitionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  if (!proposalId) return { ok: false, error: "proposalId ist Pflicht." };

  const { data: current, error: selErr } = await supabase
    .from("proposals")
    .select("id, status, version")
    .eq("id", proposalId)
    .maybeSingle();

  if (selErr || !current) {
    return { ok: false, error: "Angebot nicht gefunden." };
  }

  // DEC-108 Idempotenz: aktueller Status == newStatus → No-op, kein Audit.
  if (current.status === newStatus) {
    return { ok: true };
  }

  if (!isValidTransition(current.status, newStatus)) {
    return {
      ok: false,
      error: `Status-Wechsel von "${current.status}" zu "${newStatus}" ist nicht erlaubt.`,
    };
  }

  const timestampField = TRANSITION_TIMESTAMP_FIELD[newStatus];
  const update: Record<string, unknown> = {
    status: newStatus,
    [timestampField]: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error: updErr } = await supabase
    .from("proposals")
    .update(update)
    .eq("id", proposalId);

  if (updErr) return { ok: false, error: updErr.message };

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: "status_change",
    entity_type: "proposal",
    entity_id: proposalId,
    changes: { before: { status: current.status }, after: { status: newStatus } },
    context: "User-triggered",
  });

  revalidatePath(`/proposals/${proposalId}/edit`);
  revalidatePath("/proposals");
  return { ok: true };
}

export async function createProposalVersion(
  parentProposalId: string,
): Promise<CreateVersionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  if (!parentProposalId) {
    return { ok: false, error: "parentProposalId ist Pflicht." };
  }

  const { data: parent, error: pErr } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", parentProposalId)
    .maybeSingle();

  if (pErr || !parent) {
    return { ok: false, error: "Vorgaenger-Angebot nicht gefunden." };
  }

  const { data: parentItems, error: itemsErr } = await supabase
    .from("proposal_items")
    .select("*")
    .eq("proposal_id", parentProposalId)
    .order("position_order", { ascending: true });

  if (itemsErr) {
    return { ok: false, error: itemsErr.message };
  }

  const newVersion = (parent.version ?? 1) + 1;

  const { data: inserted, error: insErr } = await supabase
    .from("proposals")
    .insert({
      deal_id: parent.deal_id,
      contact_id: parent.contact_id,
      company_id: parent.company_id,
      title: parent.title,
      version: newVersion,
      status: "draft",
      parent_proposal_id: parentProposalId,
      tax_rate: parent.tax_rate ?? 19,
      valid_until: parent.valid_until,
      payment_terms: parent.payment_terms,
      scope_notes: parent.scope_notes,
      price_range: parent.price_range,
      objections: parent.objections,
      negotiation_notes: parent.negotiation_notes,
      created_by: user.id,
      // DEC-109: V1-Status bleibt unberuehrt. Lifecycle-Timestamps NULL,
      // Calc-Felder NULL (werden erst bei "PDF generieren" berechnet),
      // pdf_storage_path NULL (frisch zu generieren).
      sent_at: null,
      accepted_at: null,
      rejected_at: null,
      expired_at: null,
      subtotal_net: null,
      tax_amount: null,
      total_gross: null,
      pdf_storage_path: null,
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    return {
      ok: false,
      error: insErr?.message ?? "INSERT proposals fehlgeschlagen.",
    };
  }
  const newProposalId = inserted.id;

  // Items kopieren mit Snapshot-Feldern. Bei Insert-Error wird der Stub-
  // Proposal wieder geloescht (Cleanup-Pattern, kein echter Tx-Wrap noetig
  // weil Supabase JS keine Tx exponiert).
  if (parentItems && parentItems.length > 0) {
    const itemRows = parentItems.map((it) => ({
      proposal_id: newProposalId,
      product_id: it.product_id,
      position_order: it.position_order,
      quantity: it.quantity,
      unit_price_net: it.unit_price_net,
      discount_pct: it.discount_pct,
      snapshot_name: it.snapshot_name,
      snapshot_description: it.snapshot_description,
      snapshot_unit_price_at_creation: it.snapshot_unit_price_at_creation,
    }));

    const { error: itemInsErr } = await supabase
      .from("proposal_items")
      .insert(itemRows);

    if (itemInsErr) {
      // Cleanup: Stub-Proposal entfernen, kein halber Datensatz.
      await supabase.from("proposals").delete().eq("id", newProposalId);
      return {
        ok: false,
        error: `Item-Kopie fehlgeschlagen: ${itemInsErr.message}`,
      };
    }
  }

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: "create",
    entity_type: "proposal",
    entity_id: newProposalId,
    context: `Version V${newVersion} of proposal V${parent.version}`,
  });

  revalidatePath("/proposals");
  if (parent.deal_id) revalidatePath(`/deals/${parent.deal_id}`);

  return { ok: true, newProposalId };
}

export async function getProposalVersionsChain(
  proposalId: string,
): Promise<ProposalVersionEntry[]> {
  const supabase = await createClient();

  // Walk up zur Root via parent_proposal_id-Kette. V5.5 erlaubt max 5
  // Versionen, daher harter Loop-Cap fuer Schutz vor zyklischen Daten.
  let rootId: string | null = proposalId;
  const upVisited = new Set<string>();
  for (let i = 0; i < 10; i++) {
    if (!rootId || upVisited.has(rootId)) break;
    upVisited.add(rootId);
    const lookup: {
      data: { id: string; parent_proposal_id: string | null } | null;
    } = await supabase
      .from("proposals")
      .select("id, parent_proposal_id")
      .eq("id", rootId)
      .maybeSingle();
    if (!lookup.data) break;
    if (!lookup.data.parent_proposal_id) {
      rootId = lookup.data.id;
      break;
    }
    rootId = lookup.data.parent_proposal_id;
  }

  if (!rootId) return [];

  // BFS von Root abwaerts. Bei max 5 Versionen ist O(n) Queries OK.
  const collected = new Map<string, ProposalVersionEntry>();
  const queue: string[] = [rootId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (collected.has(id)) continue;
    const { data: row } = await supabase
      .from("proposals")
      .select(
        "id, version, status, parent_proposal_id, created_at, sent_at, accepted_at, rejected_at, expired_at",
      )
      .eq("id", id)
      .maybeSingle();
    if (!row) continue;
    collected.set(row.id, row as ProposalVersionEntry);
    const { data: children } = await supabase
      .from("proposals")
      .select("id")
      .eq("parent_proposal_id", row.id);
    for (const c of children ?? []) {
      queue.push(c.id as string);
    }
  }

  return [...collected.values()].sort((a, b) => b.version - a.version);
}

// Cron-only-Action. Wird vom POST /api/cron/expire-proposals mit Service-
// Role-Client gerufen — kein Auth-Check, dafuer Whitelist-strikt: nur
// `status='sent' AND valid_until < CURRENT_DATE` werden expirt.
export type ExpireOverdueResult = {
  expiredCount: number;
  expiredIds: string[];
};

export async function expireOverdueProposals(): Promise<ExpireOverdueResult> {
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: candidates, error: selErr } = await admin
    .from("proposals")
    .select("id, status, valid_until")
    .eq("status", "sent")
    .lt("valid_until", today);

  if (selErr) {
    throw new Error(`expireOverdueProposals SELECT failed: ${selErr.message}`);
  }

  const ids = (candidates ?? []).map((r) => r.id as string);
  if (ids.length === 0) {
    return { expiredCount: 0, expiredIds: [] };
  }

  const nowIso = new Date().toISOString();
  const { error: updErr } = await admin
    .from("proposals")
    .update({ status: "expired", expired_at: nowIso, updated_at: nowIso })
    .in("id", ids);

  if (updErr) {
    throw new Error(`expireOverdueProposals UPDATE failed: ${updErr.message}`);
  }

  const auditRows = ids.map((id) => ({
    actor_id: null,
    action: "status_change",
    entity_type: "proposal",
    entity_id: id,
    changes: { before: { status: "sent" }, after: { status: "expired" } },
    context: "Auto-expire by cron — valid_until passed",
  }));
  const { error: auditErr } = await admin.from("audit_log").insert(auditRows);
  if (auditErr) {
    console.warn(
      `[expireOverdueProposals] Audit-Insert fehlgeschlagen: ${auditErr.message}`,
    );
  }

  revalidatePath("/proposals");
  return { expiredCount: ids.length, expiredIds: ids };
}
