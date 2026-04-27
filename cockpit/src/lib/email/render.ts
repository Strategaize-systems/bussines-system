/**
 * Branding-Renderer (FEAT-531, DEC-095)
 *
 * Single-Source-of-Truth fuer HTML-Output von Mails.
 * - Live-Preview ruft renderBrandedHtml im Client auf (pure Function)
 * - send.ts ruft renderBrandedHtml serverseitig auf
 * - Keine Drift zwischen Vorschau und Versand
 *
 * Bei leerem Branding -> textToHtml-Fallback (Bit-fuer-Bit identisch zum V5.2-Output).
 */

import { textToHtml } from "./tracking";
import { isBrandingEmpty, type Branding, type BrandingFontFamily } from "@/types/branding";

/** Variablen-Map fuer Token-Ersetzung im Body ({{vorname}}, {{firma}}, ...). */
export type RenderVars = Record<string, string | number | null | undefined>;

const FONT_STACKS: Record<BrandingFontFamily, string> = {
  system:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
  inter:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  sans: 'Arial, Helvetica, sans-serif',
  serif: 'Georgia, "Times New Roman", Times, serif',
};

const DEFAULT_PRIMARY_COLOR = "#4454b8";

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Ersetzt {{token}}-Platzhalter im Body. Unbekannte Tokens bleiben stehen
 * (sichtbarer Hinweis, dass eine Variable fehlt).
 */
function applyVars(body: string, vars: RenderVars): string {
  if (!vars || Object.keys(vars).length === 0) return body;
  return body.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, key) => {
    const value = vars[key];
    if (value === undefined || value === null) return match;
    return String(value);
  });
}

/**
 * Konvertiert Markdown-Footer (sehr eingeschraenkt: nur Absaetze + harte Zeilenumbrueche)
 * in HTML. Vollstaendiger Markdown-Parser ist Out-of-Scope von SLC-531 — ein einfacher
 * Footer-Text reicht. Komplexe Markdown-Renderer kommen ggf. in V7+ als Block-Builder.
 */
function footerToHtml(markdown: string): string {
  return escapeHtml(markdown).replace(/\n/g, "<br />");
}

/**
 * Haupt-Renderer. Bei leerem Branding faellt auf textToHtml zurueck —
 * AC4 + AC9 verlangen Bit-fuer-Bit-Identitaet zum V5.2-Output.
 */
export function renderBrandedHtml(
  body: string,
  branding: Branding | null,
  vars: RenderVars = {},
): string {
  const resolvedBody = applyVars(body, vars);

  if (isBrandingEmpty(branding)) {
    return textToHtml(resolvedBody);
  }

  // Branding ist garantiert non-null nach isBrandingEmpty-Check
  const b = branding!;
  const fontStack = FONT_STACKS[(b.fontFamily ?? "system") as BrandingFontFamily];
  const primary = b.primaryColor || DEFAULT_PRIMARY_COLOR;
  const escapedBody = escapeHtml(resolvedBody).replace(/\n/g, "<br />");

  const logoBlock = b.logoUrl
    ? `<tr><td style="padding:0 0 24px 0;">` +
      `<img src="${escapeHtml(b.logoUrl)}" alt="Logo" style="max-height:48px;border:0;display:block;" />` +
      `</td></tr>`
    : "";

  const bodyBlock =
    `<tr><td style="padding:0 0 24px 0;font-size:14px;line-height:1.5;color:#1f2937;">` +
    escapedBody +
    `</td></tr>`;

  const footerLine = `<tr><td style="padding:0;border-top:2px solid ${escapeHtml(primary)};font-size:0;line-height:0;">&nbsp;</td></tr>`;

  const footerText = b.footerMarkdown
    ? `<tr><td style="padding:16px 0 0 0;font-size:12px;line-height:1.4;color:#6b7280;">` +
      footerToHtml(b.footerMarkdown) +
      `</td></tr>`
    : "";

  const contactRows = b.contactBlock
    ? buildContactRows(b.contactBlock, primary)
    : "";

  return (
    `<!DOCTYPE html>` +
    `<html><head><meta charset="utf-8" /></head>` +
    `<body style="margin:0;padding:0;font-family:${fontStack};background:#ffffff;">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;padding:24px;">` +
    logoBlock +
    bodyBlock +
    footerLine +
    contactRows +
    footerText +
    `</table>` +
    `</body></html>`
  );
}

function buildContactRows(
  contact: { name: string; company: string; phone: string; web: string },
  primary: string,
): string {
  const lines: string[] = [];
  if (contact.name) lines.push(`<strong>${escapeHtml(contact.name)}</strong>`);
  if (contact.company) lines.push(escapeHtml(contact.company));
  if (contact.phone) lines.push(escapeHtml(contact.phone));
  if (contact.web) {
    const safeWeb = escapeHtml(contact.web);
    lines.push(`<a href="${safeWeb}" style="color:${escapeHtml(primary)};text-decoration:none;">${safeWeb}</a>`);
  }
  if (lines.length === 0) return "";
  return (
    `<tr><td style="padding:16px 0 0 0;font-size:12px;line-height:1.5;color:#374151;">` +
    lines.join("<br />") +
    `</td></tr>`
  );
}
