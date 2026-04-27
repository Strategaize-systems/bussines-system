/**
 * Branding-Settings (FEAT-531, DEC-088, DEC-095)
 *
 * Single-Source-of-Truth fuer alle Lese-/Schreibstellen:
 * - Server Actions in app/(app)/settings/branding/actions.ts
 * - renderBrandedHtml in lib/email/render.ts
 * - send.ts Renderer-Hook
 *
 * DB: branding_settings (single-row, MIG-023 Teil 1)
 */

export type BrandingFontFamily = "system" | "inter" | "sans" | "serif";

export const BRANDING_FONT_FAMILIES: BrandingFontFamily[] = [
  "system",
  "inter",
  "sans",
  "serif",
];

export type BrandingContactBlock = {
  name: string;
  company: string;
  phone: string;
  web: string;
};

export type Branding = {
  id: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  fontFamily: BrandingFontFamily | null;
  footerMarkdown: string | null;
  contactBlock: BrandingContactBlock | null;
  updatedBy: string | null;
  updatedAt: string;
};

/**
 * Pruefung "Branding ist effektiv leer" — wird vom Renderer und send.ts genutzt,
 * um den Fallback-Pfad (textToHtml) zu triggern. AC9 Bit-fuer-Bit-Identitaet
 * zum V5.2-Output haengt davon ab.
 */
export function isBrandingEmpty(branding: Branding | null): boolean {
  if (!branding) return true;
  const hasLogo = !!branding.logoUrl;
  const hasPrimary = !!branding.primaryColor;
  const hasSecondary = !!branding.secondaryColor;
  const hasFooter = !!branding.footerMarkdown && branding.footerMarkdown.trim().length > 0;
  const hasContact =
    !!branding.contactBlock &&
    Object.values(branding.contactBlock).some((v) => !!v && v.trim().length > 0);
  // font_family allein triggert kein Branding (Default 'system' = Browser-Default)
  return !hasLogo && !hasPrimary && !hasSecondary && !hasFooter && !hasContact;
}
