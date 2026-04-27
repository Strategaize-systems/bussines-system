// =============================================================
// Variablen-Replace fuer E-Mail-Vorlagen
// =============================================================
// Geteilt zwischen Composing-Studio (SLC-533) und Live-Preview (SLC-534).
// Defensiv: leere Werte lassen die Variable im Text stehen, damit der User
// sieht, was unausgefuellt geblieben ist.

export type PlaceholderValues = {
  vorname?: string | null;
  nachname?: string | null;
  firma?: string | null;
  position?: string | null;
  deal?: string | null;
};

export const PLACEHOLDER_KEYS = [
  "vorname",
  "nachname",
  "firma",
  "position",
  "deal",
] as const;

export type PlaceholderKey = (typeof PLACEHOLDER_KEYS)[number];

export function applyPlaceholders(
  text: string,
  values?: PlaceholderValues | null,
): string {
  if (!text) return text;
  if (!values) return text;
  let result = text;
  for (const key of PLACEHOLDER_KEYS) {
    const v = values[key];
    if (v && v.trim()) {
      const re = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      result = result.replace(re, v);
    }
  }
  return result;
}
