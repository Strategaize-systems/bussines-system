// V8.7-A SLC-871 MT-5 — Pure-Helpers fuer AnswerPane-IS-Block-Rendering
// (DEC-255 / DEC-256). Klassifiziert das Render-Verhalten anhand des
// ReportResult, ohne React/JSX/jsdom-Abhaengigkeit — damit per
// feedback_pure_helper_extraction_for_jsdom_free_tests einzeln testbar.

import {
  IS_FOOTER_TEXT,
  SOFT_CAP_ERROR_MARKER,
  SOFT_CAP_FOOTER_TEXT,
} from "@/lib/is-knowledge/format-hits";

import type { IsKnowledgeHit, ReportResult } from "./types";

export type IsBlockState =
  | { kind: "none" }
  | { kind: "hits"; sorted: IsKnowledgeHit[] }
  | { kind: "soft_cap" }
  | { kind: "error"; message: string };

/**
 * Bestimmt anhand des ReportResult, welcher IS-Block gerendert werden
 * soll (DEC-255 Hits-Block, DEC-256 Error/Soft-Cap, oder gar nichts).
 * Sortiert die Hits absteigend nach Similarity (groesste Aehnlichkeit
 * zuerst).
 */
export function classifyIsBlockState(
  result: ReportResult | null | undefined
): IsBlockState {
  if (!result) return { kind: "none" };

  if (result.isKnowledgeError === SOFT_CAP_ERROR_MARKER) {
    return { kind: "soft_cap" };
  }
  if (result.isKnowledgeError !== undefined && result.isKnowledgeError !== null) {
    return { kind: "error", message: result.isKnowledgeError };
  }
  if (result.isKnowledgeHits && result.isKnowledgeHits.length > 0) {
    const sorted = [...result.isKnowledgeHits].sort(
      (a, b) => b.similarity - a.similarity
    );
    return { kind: "hits", sorted };
  }
  return { kind: "none" };
}

/**
 * Footer-Text fuer das AnswerPane.
 * - showIsFooter=true UND soft_cap: SOFT_CAP_FOOTER_TEXT
 * - showIsFooter=true sonst: IS_FOOTER_TEXT
 * - showIsFooter=false/undefined: null (kein Footer)
 */
export function pickIsFooterText(
  result: ReportResult | null | undefined,
  blockState: IsBlockState
): string | null {
  if (!result?.showIsFooter) return null;
  if (blockState.kind === "soft_cap") return SOFT_CAP_FOOTER_TEXT;
  return IS_FOOTER_TEXT;
}

/**
 * Formatiert Similarity (0..1) als gerundeter Prozent-String fuer die
 * Hits-Liste, z.B. 0.9534 -> "95%".
 */
export function formatSimilarityPercent(similarity: number): string {
  const clamped = Math.max(0, Math.min(1, similarity));
  return `${Math.round(clamped * 100)}%`;
}
