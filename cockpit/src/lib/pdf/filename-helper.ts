// V5.5 SLC-553 — Filename-Sanitization fuer Angebot-PDFs.
// Pattern: `Angebot-{slug(title) || 'unbenannt'}-V{version}[.testmode].pdf`.
// Slug ist ASCII-strict, ersetzt Umlaute, replaced Sonderzeichen mit "-",
// kollabiert Mehrfach-Trenner und kuerzt auf 50 Zeichen.

const UMLAUT_MAP: Record<string, string> = {
  "ä": "ae",
  "ö": "oe",
  "ü": "ue",
  "Ä": "Ae",
  "Ö": "Oe",
  "Ü": "Ue",
  "ß": "ss",
};

export function slugifyTitle(title: string | null | undefined): string {
  if (!title) return "";
  let out = title.replace(/[äöüÄÖÜß]/g, (c) => UMLAUT_MAP[c] ?? c);
  out = out.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  out = out.replace(/[^a-zA-Z0-9]+/g, "-");
  out = out.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  if (out.length > 50) out = out.slice(0, 50).replace(/-+$/g, "");
  return out;
}

export function sanitizeProposalFilename(
  title: string | null | undefined,
  version: number,
  isTestMode: boolean,
): string {
  if (!Number.isInteger(version) || version < 1) {
    throw new Error("sanitizeProposalFilename: version muss positive Ganzzahl sein");
  }
  const slug = slugifyTitle(title) || "unbenannt";
  const suffix = isTestMode ? ".testmode.pdf" : ".pdf";
  return `Angebot-${slug}-V${version}${suffix}`;
}
