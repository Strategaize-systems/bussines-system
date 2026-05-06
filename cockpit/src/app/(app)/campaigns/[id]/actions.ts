"use server";

// V6.2 SLC-625 — Tracking-Link Server Actions (FEAT-622, DEC-137)

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateCampaignToken } from "@/lib/campaigns/token";
import type {
  CampaignLink,
  CreateCampaignLinkInput,
} from "@/types/campaign";

const TABLE = "campaign_links";
const MAX_TOKEN_RETRIES = 5;

async function requireUser() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Nicht authentifiziert");
  return { supabase, user: auth.user };
}

function validateLinkInput(input: CreateCampaignLinkInput): string | null {
  if (!input.campaign_id) return "campaign_id ist Pflicht";
  if (!input.target_url?.trim()) return "Ziel-URL ist Pflicht";

  let url: URL;
  try {
    url = new URL(input.target_url.trim());
  } catch {
    return "Ziel-URL ist keine gueltige URL";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return "Ziel-URL muss mit https:// oder http:// beginnen";
  }

  if (!input.utm_source?.trim()) return "utm_source ist Pflicht";
  if (!input.utm_medium?.trim()) return "utm_medium ist Pflicht";
  if (!input.utm_campaign?.trim()) return "utm_campaign ist Pflicht";

  return null;
}

/**
 * Liste aller Tracking-Links einer Kampagne. Sortiert nach created_at desc.
 */
export async function listCampaignLinks(
  campaignId: string
): Promise<CampaignLink[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as CampaignLink[];
}

/**
 * INSERT campaign_link mit Token-Retry-Logic. Bei UNIQUE-Conflict (extrem
 * unwahrscheinlich) wird ein neuer Token generiert und retried (max 5x).
 */
export async function createCampaignLink(
  input: CreateCampaignLinkInput
): Promise<{ ok: true; link: CampaignLink } | { ok: false; error: string }> {
  const { supabase } = await requireUser();

  const validationError = validateLinkInput(input);
  if (validationError) return { ok: false, error: validationError };

  const payload = {
    campaign_id: input.campaign_id,
    target_url: input.target_url.trim(),
    utm_source: input.utm_source.trim(),
    utm_medium: input.utm_medium.trim(),
    utm_campaign: input.utm_campaign.trim(),
    utm_content: input.utm_content?.trim() || null,
    utm_term: input.utm_term?.trim() || null,
    label: input.label?.trim() || null,
  };

  for (let attempt = 0; attempt < MAX_TOKEN_RETRIES; attempt++) {
    const token = generateCampaignToken();
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ ...payload, token })
      .select("*")
      .single();

    if (!error && data) {
      revalidatePath(`/campaigns/${input.campaign_id}`);
      return { ok: true, link: data as CampaignLink };
    }

    // 23505 = unique_violation. Bei anderen Fehlern direkt abbrechen.
    if (error && error.code !== "23505") {
      return { ok: false, error: error.message };
    }
    // Token-Kollision -> retry mit neuem Token
  }

  return {
    ok: false,
    error: "Token-Generierung nach 5 Versuchen fehlgeschlagen — bitte erneut versuchen",
  };
}

/**
 * DELETE campaign_link. CASCADE entfernt zugehoerige clicks.
 */
export async function deleteCampaignLink(
  linkId: string,
  campaignId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from(TABLE).delete().eq("id", linkId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/campaigns/${campaignId}`);
  return { ok: true };
}

/**
 * Click-Counts der letzten 30 Tage pro Tag.
 * Returnt Array mit 30 Eintraegen (aelteste zuerst), auch wenn 0 Klicks.
 */
export async function getClicksLast30Days(
  campaignId: string
): Promise<Array<{ date: string; count: number }>> {
  const { supabase } = await requireUser();

  // Hole alle Link-IDs der Campaign
  const { data: links } = await supabase
    .from(TABLE)
    .select("id")
    .eq("campaign_id", campaignId);

  const linkIds = (links ?? []).map((l) => l.id);
  const result: Array<{ date: string; count: number }> = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Initialisiere 30-Tage-Slots (aelteste zuerst)
  const counts = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    counts.set(key, 0);
  }

  if (linkIds.length === 0) {
    for (const [date, count] of counts) result.push({ date, count });
    return result;
  }

  // Hole alle Clicks der letzten 30 Tage
  const since = new Date(today);
  since.setDate(today.getDate() - 29);
  const { data: clicks } = await supabase
    .from("campaign_link_clicks")
    .select("clicked_at")
    .in("link_id", linkIds)
    .gte("clicked_at", since.toISOString());

  for (const c of clicks ?? []) {
    const key = (c.clicked_at as string).slice(0, 10);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  for (const [date, count] of counts) result.push({ date, count });
  return result;
}
