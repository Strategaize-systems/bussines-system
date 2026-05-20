// V8 SLC-812 MT-3 — KI-Provider-Anzeige abstrahieren (DEC-221).
//
// Display-Wrapper, der konkrete LLM-Provider-/Model-IDs auf neutralen
// User-Text mapped. Aufrufer in der UI rendern NIE direkt die Model-ID
// (z.B. "eu.anthropic.claude-sonnet-4-6"), sondern leiten sie durch
// formatModelDisplayName(). Damit bleibt der User-sichtbare Provider
// austauschbar (V9+ Provider-Diversifikation), ohne UI-Strings nachzuziehen.
//
// Code-Identifier (bedrock-client.ts, BedrockSection, model_id-Audit-Spalte
// in audit_log) bleiben unveraendert — nur die User-sichtbare Darstellung
// wird neutralisiert.

/**
 * Mapped eine Model-/Inferenz-Profil-ID auf den User-sichtbaren Display-Text.
 *
 * @example
 *   formatModelDisplayName("eu.anthropic.claude-sonnet-4-6")           // "KI"
 *   formatModelDisplayName("anthropic.claude-haiku-4-5-20251001-v1:0") // "KI"
 *   formatModelDisplayName("eu.anthropic.claude-sonnet-4-6", { detail: true })
 *                                                                       // "KI Sonnet"
 *   formatModelDisplayName("future-unknown-model")                     // "KI"
 *
 * Default-Fallback bei unbekannter ID: "KI" (kein Leak des konkreten Providers).
 */
export function formatModelDisplayName(
  modelId: string | null | undefined,
  options: { detail?: boolean } = {},
): string {
  if (!options.detail) return "KI";

  const id = (modelId ?? "").toLowerCase();
  if (id.includes("sonnet")) return "KI Sonnet";
  if (id.includes("haiku")) return "KI Haiku";
  if (id.includes("opus")) return "KI Opus";
  return "KI";
}
