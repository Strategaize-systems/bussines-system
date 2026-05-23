/**
 * Slug-Generator fuer V8.4 Tenant-Customer-DSE-Pfade `/p/[slug]/datenschutz`.
 *
 * Pattern aus strategaize-onboarding-plattform/src/lib/partner/slug.ts.
 * (Memory: reference_partner_slug_pattern.md / Rule: strategaize-pattern-reuse.md.)
 *
 * Pure Functions — keine DB-Calls, keine I/O. Eigenstaendige Implementierung
 * mit NFD-Normalisierung + expliziter Umlaut-Translit (ae/oe/ue/ss) statt
 * `lib/handbook/slugify.ts` (github-slugger) das Umlaute durchlaesst. Die
 * SQL-Backfill-Translit in MIG-038 Phase 4 ist die naive ASCII-Variante
 * (chained replaceAll laut feedback_sql_translate_no_multi_char_expansion);
 * dieser TS-Generator ist die authoritative Variante fuer alle
 * Tenant-Onboarding-Anlagen ab V8.5+.
 */

import { isReservedSlug } from "./reserved-slugs";

const GERMAN_UMLAUTS: ReadonlyArray<readonly [string, string]> = [
  ["ä", "ae"],
  ["ö", "oe"],
  ["ü", "ue"],
  ["Ä", "Ae"],
  ["Ö", "Oe"],
  ["Ü", "Ue"],
  ["ß", "ss"],
];

const MAX_SLUG_LENGTH = 60;

/**
 * Wandelt einen Team-Display-Name (z.B. "Strategaize Transition BV") in einen
 * URL-baren Kebab-Case-Slug (z.B. "strategaize-transition-bv") um.
 *
 * Schritte:
 * 1) Deutsche Umlaute `ae/oe/ue/ss` ersetzen (case-erhaltend).
 * 2) Lowercase.
 * 3) NFD-Decompose + Combining-Marks-Strip (entfernt Accent-Diakritika wie
 *    `é → e`, `ô → o`).
 * 4) Alle Nicht-`[a-z0-9]` zu `-` ersetzen.
 * 5) Mehrfach-Hyphens kollabieren + Leading/Trailing-Hyphens entfernen.
 * 6) Auf max 60 chars truncate + Trailing-Hyphen nach Truncate entfernen.
 *
 * Wirft `Error` wenn der Input leer ist oder nach der Bereinigung leer waere
 * (z.B. nur Sonderzeichen). Caller-Pflicht: bei Edge-Cases manuellen
 * Fallback-Slug erzeugen (`team-<id-prefix>` analog OP-V7 SLC-131).
 */
export function generateSlug(displayName: string): string {
  if (!displayName || displayName.trim().length === 0) {
    throw new Error("cannot generate slug from empty string");
  }

  let normalized = displayName;
  for (const [from, to] of GERMAN_UMLAUTS) {
    normalized = normalized.replaceAll(from, to);
  }

  normalized = normalized.toLowerCase();

  // NFD-Decompose + Combining-Marks-Strip (U+0300..U+036F) entfernt
  // Accent-Diakritika wie `é → e`, `ô → o`.
  normalized = normalized.normalize("NFD").replace(/[̀-ͯ]/g, "");

  normalized = normalized.replace(/[^a-z0-9]+/g, "-");
  normalized = normalized.replace(/-+/g, "-");
  normalized = normalized.replace(/^-+|-+$/g, "");

  if (normalized.length > MAX_SLUG_LENGTH) {
    normalized = normalized.substring(0, MAX_SLUG_LENGTH).replace(/-+$/, "");
  }

  if (normalized.length === 0) {
    throw new Error(
      "cannot generate slug from input — no alphanumeric chars after normalization",
    );
  }

  return normalized;
}

/**
 * Wie `generateSlug`, aber stellt Eindeutigkeit gegenueber einer existierenden
 * Slug-Menge sicher. Bei Kollision ODER Reserve-Slug-Treffer wird ein numerisches
 * Suffix `-2`, `-3`, ... angehaengt bis der Slug frei ist.
 *
 * `existingSlugs` darf case-sensitive sein — der Compare nutzt lowercase
 * (Vergleich passt zum DB-UNIQUE-Index `teams_slug_lower_unique` aus MIG-038).
 *
 * Reserve-Slugs werden wie Kollisionen behandelt (Caller hat keine andere
 * Option als Suffix anzuhaengen).
 */
export function generateUniqueSlug(
  displayName: string,
  existingSlugs: Set<string>,
): string {
  const baseSlug = generateSlug(displayName);
  const existingLower = new Set(
    Array.from(existingSlugs).map((s) => s.toLowerCase()),
  );

  const isTaken = (candidate: string): boolean =>
    existingLower.has(candidate.toLowerCase()) || isReservedSlug(candidate);

  if (!isTaken(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  let candidate = `${baseSlug}-${suffix}`;
  while (isTaken(candidate)) {
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
  return candidate;
}
