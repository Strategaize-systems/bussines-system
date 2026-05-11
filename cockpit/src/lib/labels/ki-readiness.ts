// SLC-667 MT-3 — Zentrale UI-Label-Map fuer AI-Bereitschaft (Rename von "KI-Reife").
//
// DB-Spaltenname `ai_readiness` bleibt unveraendert. Aliases fuer E-Mail-Template-
// Variable "ki-reife" werden via Reverse-Lookup unterstuetzt (DEC-175).

export const KI_READINESS_LABEL = "AI-Bereitschaft";

export const KI_READINESS_OPTIONS: Record<string, string> = {
  high: "Hoch",
  medium: "Mittel",
  low: "Niedrig",
};

/**
 * Reverse-Lookup fuer Legacy-Template-Variablen.
 * Wenn ein E-Mail-Template noch `{{ki-reife}}` enthaelt, wird der Renderer
 * dies zu `ai_readiness` aufloesen. Schema bleibt unangetastet.
 */
export const KI_READINESS_TEMPLATE_ALIASES: Record<string, string> = {
  "ki-reife": "ai_readiness",
  kiReife: "ai_readiness",
};
