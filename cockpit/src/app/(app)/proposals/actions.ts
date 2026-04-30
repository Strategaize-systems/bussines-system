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
    .select("title, tax_rate, valid_until, payment_terms")
    .eq("id", proposalId)
    .maybeSingle();

  if (!before) return { ok: false, error: "Angebot nicht gefunden." };

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
