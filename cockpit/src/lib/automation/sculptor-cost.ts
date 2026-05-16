// V7.5 SLC-752 MT-5 — Bedrock-Pricing-Table + Cost-Berechnung.
//
// DEC-208 Real-Cost-Display: jeder Sculpt-Aufruf zeigt dem User USD-Kosten
// in Inspection-Log + Apply-Confirm. Die Tabelle pflegen wir manuell aus
// AWS Bedrock-Pricing-Page.
//
// Stand: AWS Bedrock Pricing (Region eu-central-1, abgerufen 2026-05-16).
// Quelle: https://aws.amazon.com/bedrock/pricing/

export interface BedrockUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface BedrockPricing {
  /** USD pro 1.000 Input-Tokens. */
  input_per_1k_usd: number;
  /** USD pro 1.000 Output-Tokens. */
  output_per_1k_usd: number;
  /** Human-readable Source-Tag. */
  source_note: string;
}

/**
 * Pricing-Lookup-Table fuer Model-IDs die der Sculptor verwenden kann.
 *
 * Inferenz-Profil-IDs (`eu.anthropic...`) und Direct-Model-IDs
 * (`anthropic.claude-sonnet-4...`) teilen sich denselben Preis (AWS-Doku
 * 2026-05-16). Eintraege bewusst doppelt halten damit ein Match unabhaengig
 * von der gewaehlten Aufruf-Variante funktioniert.
 */
export const PRICING: Record<string, BedrockPricing> = {
  // Claude Sonnet 4.6 (Standard fuer Cockpit-Bedrock-Aufrufer V3-V7.5)
  "anthropic.claude-sonnet-4-6-20250514-v1:0": {
    input_per_1k_usd: 0.003,
    output_per_1k_usd: 0.015,
    source_note: "AWS Bedrock Pricing eu-central-1, Claude Sonnet 4.6 (2026-05-16).",
  },
  "eu.anthropic.claude-sonnet-4-6-20250514-v1:0": {
    input_per_1k_usd: 0.003,
    output_per_1k_usd: 0.015,
    source_note: "AWS Bedrock Pricing eu-central-1, Claude Sonnet 4.6 (Inferenz-Profil, 2026-05-16).",
  },
  // Claude Sonnet 4.5 — Fallback falls Cockpit-LLM_MODEL temporaer downgraded wird
  "anthropic.claude-sonnet-4-5-20250109-v1:0": {
    input_per_1k_usd: 0.003,
    output_per_1k_usd: 0.015,
    source_note: "AWS Bedrock Pricing eu-central-1, Claude Sonnet 4.5 (2026-05-16).",
  },
  // Claude Haiku 4.5 — falls Cost-Profile fuer Sculpt nachgeruestet wird (V7.6+)
  "anthropic.claude-haiku-4-5-20251001-v1:0": {
    input_per_1k_usd: 0.001,
    output_per_1k_usd: 0.005,
    source_note: "AWS Bedrock Pricing eu-central-1, Claude Haiku 4.5 (2026-05-16).",
  },
};

export class UnknownModelPricingError extends Error {
  constructor(modelId: string) {
    super(
      `sculptor-cost: Pricing fuer modelId='${modelId}' nicht in PRICING-Tabelle. Pflege https://aws.amazon.com/bedrock/pricing/ in sculptor-cost.ts ein.`
    );
    this.name = "UnknownModelPricingError";
  }
}

/**
 * Berechnet Kosten in USD fuer einen Bedrock-Sculpt-Aufruf.
 *
 * @param usage   Token-Counts aus Bedrock-Response (Anthropic Messages API:
 *                `usage.input_tokens`, `usage.output_tokens`).
 * @param modelId Vollstaendige Model-/Inferenz-Profil-ID wie an Bedrock gesendet.
 * @returns USD-Kosten als number. Throws bei unbekanntem Model.
 */
export function calculateSculptCost(
  usage: BedrockUsage,
  modelId: string
): number {
  const pricing = PRICING[modelId];
  if (!pricing) throw new UnknownModelPricingError(modelId);
  if (
    !Number.isFinite(usage.input_tokens) ||
    usage.input_tokens < 0 ||
    !Number.isFinite(usage.output_tokens) ||
    usage.output_tokens < 0
  ) {
    throw new Error(
      `sculptor-cost: usage.input_tokens/output_tokens muessen >= 0 und finite sein. Erhalten: ${JSON.stringify(usage)}`
    );
  }
  const inputCost = (usage.input_tokens / 1000) * pricing.input_per_1k_usd;
  const outputCost = (usage.output_tokens / 1000) * pricing.output_per_1k_usd;
  return inputCost + outputCost;
}

/**
 * Akkumuliert Kosten ueber mehrere Bedrock-Aufrufe (Re-Prompt-Loop).
 */
export function sumSculptCosts(costs: readonly number[]): number {
  return costs.reduce((acc, c) => acc + c, 0);
}
