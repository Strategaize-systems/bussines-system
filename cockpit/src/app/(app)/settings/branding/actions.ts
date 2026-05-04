"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BRANDING_FONT_FAMILIES,
  BUSINESS_COUNTRIES,
  type Branding,
  type BrandingContactBlock,
  type BrandingFontFamily,
  type BusinessCountry,
} from "@/types/branding";
import {
  validateDeVatId,
  validateNlVatId,
} from "@/lib/validation/vat-id";

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
  vat_id: string | null;
  business_country: string | null;
  updated_by: string | null;
  updated_at: string;
};

const BRANDING_SELECT =
  "id, logo_url, primary_color, secondary_color, font_family, footer_markdown, contact_block, vat_id, business_country, updated_by, updated_at";

function rowToBranding(row: BrandingRow): Branding {
  const font = row.font_family;
  const fontFamily =
    font && (BRANDING_FONT_FAMILIES as string[]).includes(font)
      ? (font as BrandingFontFamily)
      : null;
  const country = row.business_country;
  const businessCountry: BusinessCountry =
    country && (BUSINESS_COUNTRIES as string[]).includes(country)
      ? (country as BusinessCountry)
      : "NL";
  return {
    id: row.id,
    logoUrl: row.logo_url,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    fontFamily,
    footerMarkdown: row.footer_markdown,
    contactBlock: row.contact_block,
    vatId: row.vat_id,
    businessCountry,
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
    .select(BRANDING_SELECT)
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
    .select(BRANDING_SELECT)
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

function sanitizeBusinessCountry(value: FormDataEntryValue | null): BusinessCountry {
  if (typeof value !== "string") return "NL";
  return (BUSINESS_COUNTRIES as string[]).includes(value)
    ? (value as BusinessCountry)
    : "NL";
}

/**
 * Validiert vat_id kontextabhaengig (DEC-128):
 * - business_country=NL -> validateNlVatId
 * - business_country=DE -> validateDeVatId
 *
 * Leerer Input ist erlaubt (NULL in DB) — nur bei nicht-leerem Input
 * wird das Format gegen den Country gepruefft.
 */
function sanitizeVatId(
  value: FormDataEntryValue | null,
  businessCountry: BusinessCountry,
): { value: string | null; error: string | null } {
  if (typeof value !== "string") return { value: null, error: null };
  const trimmed = value.trim();
  if (!trimmed) return { value: null, error: null };
  const result =
    businessCountry === "DE" ? validateDeVatId(trimmed) : validateNlVatId(trimmed);
  if (!result.valid) {
    return { value: null, error: result.error };
  }
  return { value: result.value, error: null };
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

  const businessCountry = sanitizeBusinessCountry(formData.get("business_country"));
  const vatIdResult = sanitizeVatId(formData.get("vat_id"), businessCountry);
  if (vatIdResult.error) {
    return { error: vatIdResult.error };
  }

  const payload = {
    logo_url: sanitizeText(formData.get("logo_url")),
    primary_color: sanitizeColor(formData.get("primary_color")),
    secondary_color: sanitizeColor(formData.get("secondary_color")),
    font_family: sanitizeFontFamily(formData.get("font_family")),
    footer_markdown: sanitizeText(formData.get("footer_markdown")),
    contact_block: sanitizeContactBlock(formData),
    vat_id: vatIdResult.value,
    business_country: businessCountry,
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

  // Logo wird via /api/branding/logo serverseitig durch Next.js geproxied.
  // Storage-Public-URL via Kong ist im aktuellen Hosting-Setup extern nicht
  // erreichbar (kein Reverse-Proxy zu Kong unter `/supabase/storage`).
  // Cache-Buster `v` erzwingt Refresh nach jedem Upload.
  const appBase = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  if (!appBase) {
    return { error: "NEXT_PUBLIC_APP_URL ENV nicht gesetzt" };
  }
  const logoUrl = `${appBase}/api/branding/logo?v=${Date.now()}`;

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
