"use server";

// V6.2 SLC-624 — Campaign-CRUD Server Actions (FEAT-622, DEC-135)

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import {
  CAMPAIGN_STATUSES,
  CAMPAIGN_TYPES,
  type Campaign,
  type CampaignListFilter,
  type CampaignPickerItem,
  type CampaignStatus,
  type CampaignWithStats,
  type SaveCampaignInput,
} from "@/types/campaign";

const TABLE = "campaigns";
const MAX_NAME_LEN = 120;
const MAX_NOTES_LEN = 5000;

async function requireUser() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Nicht authentifiziert");
  return { supabase, user: auth.user };
}

/**
 * Validiert Save-Input. Gibt Error-String oder null zurueck.
 */
function validateInput(input: SaveCampaignInput): string | null {
  const name = input.name?.trim() ?? "";
  if (!name) return "Name darf nicht leer sein";
  if (name.length < 2) return "Name muss mindestens 2 Zeichen lang sein";
  if (name.length > MAX_NAME_LEN)
    return `Name zu lang (max ${MAX_NAME_LEN} Zeichen)`;

  if (!CAMPAIGN_TYPES.includes(input.type)) {
    return `Ungueltiger Typ: ${input.type}`;
  }
  if (!CAMPAIGN_STATUSES.includes(input.status)) {
    return `Ungueltiger Status: ${input.status}`;
  }

  if (!input.start_date) return "Startdatum ist Pflicht";
  // ISO date check (YYYY-MM-DD)
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRe.test(input.start_date))
    return "Startdatum muss im Format YYYY-MM-DD sein";

  if (input.end_date) {
    if (!dateRe.test(input.end_date))
      return "Enddatum muss im Format YYYY-MM-DD sein";
    if (input.end_date < input.start_date)
      return "Enddatum darf nicht vor dem Startdatum liegen";
  }

  if (input.notes && input.notes.length > MAX_NOTES_LEN)
    return `Notizen zu lang (max ${MAX_NOTES_LEN} Zeichen)`;

  return null;
}

/**
 * Liste aller Kampagnen, optional gefiltert. Sortiert nach updated_at desc.
 * KEINE KPI-Counts (das macht getCampaign(id) per Subqueries) — Listing
 * verwendet einfache Aggregat-Counts in einem zweiten Roundtrip.
 */
export async function listCampaigns(
  filter?: CampaignListFilter
): Promise<Array<Campaign & { lead_count: number; deal_count: number }>> {
  const { supabase } = await requireUser();

  let q = supabase
    .from(TABLE)
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (filter?.status) {
    if (Array.isArray(filter.status)) {
      q = q.in("status", filter.status);
    } else {
      q = q.eq("status", filter.status);
    }
  }
  if (filter?.type) {
    q = q.eq("type", filter.type);
  }
  if (filter?.search && filter.search.trim()) {
    q = q.ilike("name", `%${filter.search.trim()}%`);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  // Aggregate counts in a single second roundtrip per Tabelle.
  const ids = data.map((c) => c.id);
  const [{ data: leadRows }, { data: dealRows }] = await Promise.all([
    supabase.from("contacts").select("campaign_id").in("campaign_id", ids),
    supabase.from("deals").select("campaign_id").in("campaign_id", ids),
  ]);

  const leadMap = new Map<string, number>();
  for (const r of leadRows ?? []) {
    if (!r.campaign_id) continue;
    leadMap.set(r.campaign_id, (leadMap.get(r.campaign_id) ?? 0) + 1);
  }
  const dealMap = new Map<string, number>();
  for (const r of dealRows ?? []) {
    if (!r.campaign_id) continue;
    dealMap.set(r.campaign_id, (dealMap.get(r.campaign_id) ?? 0) + 1);
  }

  return data.map((c) => ({
    ...(c as Campaign),
    lead_count: leadMap.get(c.id) ?? 0,
    deal_count: dealMap.get(c.id) ?? 0,
  }));
}

/**
 * Schlanke Variante fuer CampaignPicker — nur id/name/type/status.
 * Default: status IN ('draft','active'), schliesst archived/finished aus.
 */
export async function listCampaignsForPicker(
  statuses: CampaignStatus[] = ["draft", "active"]
): Promise<CampaignPickerItem[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, name, type, status")
    .in("status", statuses)
    .order("name", { ascending: true })
    .limit(100);

  if (error) throw new Error(error.message);
  return (data ?? []) as CampaignPickerItem[];
}

/**
 * Lese eine Kampagne + KPIs (lead_count, deal_count, won_count, won_value,
 * conversion_rate). KPIs werden via 2 Aggregat-Queries berechnet.
 */
export async function getCampaign(
  id: string
): Promise<CampaignWithStats | null> {
  const { supabase } = await requireUser();

  const { data: campaign, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!campaign) return null;

  // KPIs in 2 parallelen Roundtrips:
  // 1) lead_count via contacts mit campaign_id
  // 2) deal-rows mit status + value via deals mit campaign_id
  const [leadsRes, dealsRes] = await Promise.all([
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", id),
    supabase
      .from("deals")
      .select("status, value")
      .eq("campaign_id", id),
  ]);

  if (leadsRes.error) throw new Error(leadsRes.error.message);
  if (dealsRes.error) throw new Error(dealsRes.error.message);

  const lead_count = leadsRes.count ?? 0;
  const deals = (dealsRes.data ?? []) as Array<{
    status: string;
    value: number | null;
  }>;
  const deal_count = deals.length;
  let won_count = 0;
  let won_value = 0;
  for (const d of deals) {
    if (d.status === "won") {
      won_count += 1;
      won_value += Number(d.value ?? 0);
    }
  }
  const conversion_rate =
    lead_count > 0 ? Math.round((won_count / lead_count) * 1000) / 10 : null;

  return {
    ...(campaign as Campaign),
    lead_count,
    deal_count,
    won_count,
    won_value,
    conversion_rate,
  };
}

/**
 * INSERT oder UPDATE einer Kampagne. Bei UPDATE muss `id` gesetzt sein.
 *
 * Validation:
 *   - name (NOT NULL, min 2, max 120)
 *   - type (Whitelist)
 *   - start_date (NOT NULL, ISO)
 *   - end_date >= start_date wenn gesetzt
 *   - status (Whitelist)
 *
 * Case-insensitive Name-Uniqueness wird per UNIQUE INDEX (LOWER(name))
 * vom Postgres erzwungen — Fehler wird hier in lesbare Meldung uebersetzt.
 */
export async function saveCampaign(
  input: SaveCampaignInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { supabase, user } = await requireUser();

  const validationError = validateInput(input);
  if (validationError) return { ok: false, error: validationError };

  const payload = {
    name: input.name.trim(),
    type: input.type,
    channel: input.channel?.trim() || null,
    start_date: input.start_date,
    end_date: input.end_date || null,
    status: input.status,
    external_ref: input.external_ref?.trim() || null,
    notes: input.notes?.trim() || null,
  };

  if (input.id) {
    const { error: updErr } = await supabase
      .from(TABLE)
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", input.id);

    if (updErr) {
      return { ok: false, error: humanize(updErr.message) };
    }

    void logAudit({
      action: "update",
      entityType: "campaign",
      entityId: input.id,
      changes: {
        after: { name: payload.name, status: payload.status, type: payload.type },
      },
    });
    revalidatePath("/settings/campaigns");
    revalidatePath(`/campaigns/${input.id}`);
    return { ok: true, id: input.id };
  }

  const { data, error: insErr } = await supabase
    .from(TABLE)
    .insert({ ...payload, created_by: user.id })
    .select("id")
    .single();

  if (insErr || !data) {
    return { ok: false, error: humanize(insErr?.message ?? "Insert fehlgeschlagen") };
  }

  void logAudit({
    action: "create",
    entityType: "campaign",
    entityId: data.id,
    changes: {
      after: { name: payload.name, type: payload.type, status: payload.status },
    },
  });
  revalidatePath("/settings/campaigns");
  return { ok: true, id: data.id };
}

/**
 * Setzt status='archived'. Soft-Disable-Variante zu deleteCampaign.
 */
export async function archiveCampaign(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from(TABLE)
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  void logAudit({
    action: "update",
    entityType: "campaign",
    entityId: id,
    changes: { after: { status: "archived" } },
  });
  revalidatePath("/settings/campaigns");
  revalidatePath(`/campaigns/${id}`);
  return { ok: true };
}

/**
 * Loescht Kampagne. Per ON DELETE SET NULL werden contacts/companies/deals
 * .campaign_id automatisch auf NULL gesetzt (Attribution-Verlust!).
 *
 * Caller MUSS User vor Loesch-Aktion warnen (UI Delete-Confirm-Dialog).
 */
export async function deleteCampaign(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  void logAudit({
    action: "delete",
    entityType: "campaign",
    entityId: id,
  });
  revalidatePath("/settings/campaigns");
  return { ok: true };
}

/**
 * Postgres-Fehler in lesbare Meldungen uebersetzen.
 * Insbesondere UNIQUE-Constraint-Violations.
 */
function humanize(msg: string): string {
  if (msg.includes("idx_campaigns_name_lower_uq") || msg.includes("duplicate key value violates unique constraint \"idx_campaigns_name_lower_uq\"")) {
    return "Eine Kampagne mit diesem Namen existiert bereits (Gross-/Kleinschreibung wird ignoriert)";
  }
  if (msg.includes("idx_campaigns_external_ref_uq")) {
    return "Die externe Referenz (external_ref) ist bereits vergeben";
  }
  if (msg.includes("campaigns_date_range_chk")) {
    return "Enddatum darf nicht vor dem Startdatum liegen";
  }
  if (msg.includes("campaigns_type_check")) {
    return "Ungueltiger Kampagnen-Typ";
  }
  if (msg.includes("campaigns_status_check")) {
    return "Ungueltiger Status";
  }
  return msg;
}
