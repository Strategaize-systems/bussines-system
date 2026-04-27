"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BRANDING_FONT_FAMILIES,
  type Branding,
  type BrandingContactBlock,
  type BrandingFontFamily,
} from "@/types/branding";

const BUCKET = "branding";
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
]);

type BrandingRow = {
  id: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  font_family: string | null;
  footer_markdown: string | null;
  contact_block: BrandingContactBlock | null;
  updated_by: string | null;
  updated_at: string;
};

function rowToBranding(row: BrandingRow): Branding {
  const font = row.font_family;
  const fontFamily =
    font && (BRANDING_FONT_FAMILIES as string[]).includes(font)
      ? (font as BrandingFontFamily)
      : null;
  return {
    id: row.id,
    logoUrl: row.logo_url,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    fontFamily,
    footerMarkdown: row.footer_markdown,
    contactBlock: row.contact_block,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

async function requireUser() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Nicht authentifiziert");
  return { supabase, user: auth.user };
}

/**
 * Liefert die einzige branding_settings-Row.
 * Single-row-Enforcement: nimmt die aelteste Row (sortiert nach created/updated).
 * Wenn keine Row existiert (Migration nicht gelaufen), gibt null zurueck —
 * Renderer faellt dann auf textToHtml zurueck.
 */
export async function getBranding(): Promise<Branding | null> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("branding_settings")
    .select(
      "id, logo_url, primary_color, secondary_color, font_family, footer_markdown, contact_block, updated_by, updated_at",
    )
    .order("updated_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return rowToBranding(data as BrandingRow);
}

/**
 * Server-Side Helper fuer send.ts (Renderer-Hook).
 * Nutzt service_role (BYPASSRLS) — laeuft auch in Cron-Jobs ohne User-Session.
 */
export async function getBrandingForSend(): Promise<Branding | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("branding_settings")
    .select(
      "id, logo_url, primary_color, secondary_color, font_family, footer_markdown, contact_block, updated_by, updated_at",
    )
    .order("updated_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) return null; // best-effort, Fallback auf textToHtml
  if (!data) return null;
  return rowToBranding(data as BrandingRow);
}

function sanitizeColor(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Sehr lockere Validierung: Hex (#xxx, #xxxxxx) oder rgb()/named
  if (!/^#[0-9a-fA-F]{3,8}$/.test(trimmed) && !/^[a-zA-Z]+$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function sanitizeText(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function sanitizeFontFamily(value: FormDataEntryValue | null): BrandingFontFamily {
  if (typeof value !== "string") return "system";
  return (BRANDING_FONT_FAMILIES as string[]).includes(value)
    ? (value as BrandingFontFamily)
    : "system";
}

function sanitizeContactBlock(formData: FormData): BrandingContactBlock | null {
  const name = sanitizeText(formData.get("contact_name")) ?? "";
  const company = sanitizeText(formData.get("contact_company")) ?? "";
  const phone = sanitizeText(formData.get("contact_phone")) ?? "";
  const web = sanitizeText(formData.get("contact_web")) ?? "";
  if (!name && !company && !phone && !web) return null;
  return { name, company, phone, web };
}

/**
 * UPSERT auf bestehende Row (single-row-Enforcement).
 * Wenn keine Row existiert, wird die erste angelegt — sollte nicht passieren,
 * da MIG-023 eine Empty-Row seedet, aber defensiv abgesichert.
 */
export async function updateBranding(
  formData: FormData,
): Promise<{ error: string }> {
  const { supabase, user } = await requireUser();

  const existing = await getBranding();

  const payload = {
    logo_url: sanitizeText(formData.get("logo_url")),
    primary_color: sanitizeColor(formData.get("primary_color")),
    secondary_color: sanitizeColor(formData.get("secondary_color")),
    font_family: sanitizeFontFamily(formData.get("font_family")),
    footer_markdown: sanitizeText(formData.get("footer_markdown")),
    contact_block: sanitizeContactBlock(formData),
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase
      .from("branding_settings")
      .update(payload)
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("branding_settings").insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath("/settings/branding");
  return { error: "" };
}

function extOf(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/svg+xml":
      return "svg";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

/**
 * Logo-Upload mit App-Level-Validierung (max 2 MB, MIME-Whitelist).
 * Loescht das alte Logo-File falls eines existiert (best-effort).
 * Persistiert die neue Public-URL in branding_settings.logo_url.
 */
export async function uploadLogo(
  formData: FormData,
): Promise<{ error: string; logoUrl?: string }> {
  await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "Keine Datei uebergeben" };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { error: `Datei zu gross (max ${MAX_LOGO_BYTES / 1024 / 1024} MB)` };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return { error: `MIME-Typ nicht erlaubt: ${file.type}` };
  }

  const admin = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `logo-${Date.now()}.${extOf(file.type)}`;

  // Alten Logo-File best-effort entfernen (kein Hard-Fail)
  const existing = await getBrandingForSend();
  if (existing?.logoUrl) {
    const match = existing.logoUrl.match(/\/branding\/(logo-[^?]+)/);
    if (match?.[1]) {
      await admin.storage.from(BUCKET).remove([match[1]]);
    }
  }

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(filename, buffer, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) return { error: `Upload fehlgeschlagen: ${uploadError.message}` };

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(filename);
  const logoUrl = pub?.publicUrl ?? null;
  if (!logoUrl) return { error: "Public-URL konnte nicht erzeugt werden" };

  // logo_url direkt persistieren (User muss nicht zusaetzlich speichern)
  const { user } = await requireUser();
  const current = await getBranding();
  if (current) {
    const { error: updErr } = await admin
      .from("branding_settings")
      .update({ logo_url: logoUrl, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq("id", current.id);
    if (updErr) return { error: updErr.message };
  } else {
    const { error: insErr } = await admin
      .from("branding_settings")
      .insert({ logo_url: logoUrl, updated_by: user.id });
    if (insErr) return { error: insErr.message };
  }

  revalidatePath("/settings/branding");
  return { error: "", logoUrl };
}
