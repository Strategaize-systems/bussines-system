// SLC-663 MT-2 — Pure-Function-Helpers für Type-Ahead.
// Liegen separat, damit Vitest ohne fetch/DB lauffähig ist.

export type TypeaheadDealResult = {
  id: string;
  title: string;
  company_name: string | null;
  contact_name: string | null;
};

/**
 * Säubert den User-Query-String:
 *  - trimmt Whitespace
 *  - escaped SQL-ILIKE-Wildcards (% und _) damit sie literal matchen
 *  - returnt null wenn weniger als 2 Zeichen übrig sind
 *  - cappt auf 200 Zeichen, um DOS via riesigen Pattern zu vermeiden
 */
export function sanitizeTypeaheadQuery(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length < 2) return null;
  const escaped = trimmed
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
  return escaped.slice(0, 200);
}

/**
 * Merged 3 Quellen (title-match, company-match, contact-match) zu einer
 * deduplizierten Liste mit Limit. Reihenfolge: title vor company vor contact —
 * exakte Title-Treffer fühlen sich für den User direkter an.
 */
export function mergeTypeaheadResults(
  byTitle: TypeaheadDealResult[],
  byCompany: TypeaheadDealResult[],
  byContact: TypeaheadDealResult[],
  limit: number,
): TypeaheadDealResult[] {
  const seen = new Set<string>();
  const out: TypeaheadDealResult[] = [];
  for (const batch of [byTitle, byCompany, byContact]) {
    for (const r of batch) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      out.push(r);
      if (out.length >= limit) return out;
    }
  }
  return out;
}
