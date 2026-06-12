// V8.7-B SLC-355 MT-3 — Bedrock-Verdichtungs-Pass (NEU, riskantester Teil R-355-1).
//
// (a) Win/Loss-Bucket-Markdowns -> eine destillierte, anonymisierte Lessons-
//     Markdown pro Bucket.
// (b) Activity-Notizen pro Branche -> Einwand-Typen + Behandlungs-Zusammenfassung.
//
// Sicherheits-Posture (R-355-1, R-355-2):
//   - Input ist bereits Branchen-Aggregat (nie per-Deal-Identitaet).
//   - Pre-Prompt-Redact strippt rohe Email/Telefon (redactPiiString) belt-before.
//   - System-Prompt verlangt VOLLSTAENDIGE Anonymisierung (keine Namen/Identifier).
//   - temperature 0.2 (deterministisch, wenig Halluzination).
//   - LLM-Fehler/Exception -> Bucket wird uebersprungen (fail-soft), Cron laeuft weiter.
// Cost BS-lokal: calculateSculptCost(usage, modelId) -> an Caller fuer audit_log.

import { queryLLM as defaultQueryLLM } from "@/lib/ai/bedrock-client";
import { calculateSculptCost } from "@/lib/automation/sculptor-cost";
import { redactPiiString } from "./redact";
import type { ObjectionGroup, WinLossBucket } from "./types";

export interface DistillDeps {
  queryLLM: typeof defaultQueryLLM;
}

export interface DistillResult {
  markdown: string;
  costUsd: number;
}

const MAX_TOKENS = 1200;
const TEMPERATURE = 0.2;
const MAX_INPUT_CHARS = 16_000; // R-355-3: Roh-Input deckeln

const WINLOSS_SYSTEM_PROMPT = `Du bist ein Vertriebs-Analyst. Verdichte mehrere Win/Loss-Analysen DESSELBEN
Branchen- und Deal-Groessen-Segments zu EINER kompakten Lessons-Markdown.

HARTE REGELN (Anonymisierung, nicht verhandelbar):
- KEINE Namen: keine Firmen-, Personen-, Produkt- oder Projektnamen, keine Orte,
  keine Emails/Telefonnummern, keine sonstigen Identifier. Sollte im Input ein
  Name auftauchen, ersetze ihn durch eine generische Rolle (z.B. "der Kunde").
- Nur aggregierte, uebertragbare Muster — niemals Einzelfall-Spezifika, die einen
  Deal re-identifizierbar machen.
- Antworte ausschliesslich in Markdown (Ueberschrift + Stichpunkte), Deutsch.`;

const OBJECTION_SYSTEM_PROMPT = `Du bist ein Vertriebs-Analyst. Klassifiziere Einwand-Behandlungen (Objections)
aus Freitext-Notizen EINER Branche und fasse bewaehrte Reaktionen zusammen.

Taxonomie-Hint (nutze diese Einwand-Typen, ergaenze nur wenn noetig):
Preis/Budget, Timing, Bedarf/Fit, Wettbewerb, Vertrauen/Risiko, Entscheider/Prozess.

HARTE REGELN (Anonymisierung, nicht verhandelbar):
- KEINE Namen: keine Firmen-, Personen-, Produktnamen, keine Emails/Telefonnummern,
  keine sonstigen Identifier. Generalisiere zu Rollen/Mustern.
- Erfinde keine Einwand-Typen, die nicht durch die Notizen gestuetzt sind.
- Antworte ausschliesslich in Markdown (Einwand-Typ -> bewaehrte Reaktion), Deutsch.`;

function clamp(s: string): string {
  return s.length <= MAX_INPUT_CHARS ? s : s.slice(0, MAX_INPUT_CHARS);
}

function safeCost(
  usage: { input_tokens: number; output_tokens: number } | undefined,
  modelId: string | undefined
): number {
  if (!usage || !modelId) return 0;
  try {
    return calculateSculptCost(usage, modelId);
  } catch {
    // Unbekanntes Model o.ae. -> Cost faellt auf 0, Markdown bleibt erhalten.
    return 0;
  }
}

/**
 * Destilliert die Roh-Win/Loss-Markdowns eines Buckets. null bei LLM-Fehler.
 */
export async function distillWinLossBucket(
  bucket: WinLossBucket,
  deps: DistillDeps = { queryLLM: defaultQueryLLM }
): Promise<DistillResult | null> {
  const outcome = bucket.targetStatus === "won" ? "GEWONNEN" : "VERLOREN";
  const body = clamp(
    bucket.runMarkdowns
      .map((m, i) => `### Analyse ${i + 1}\n${redactPiiString(m)}`)
      .join("\n\n")
  );
  const userPrompt = [
    `Branche: ${bucket.branche}`,
    `Deal-Groesse: ${bucket.sizeBucket}`,
    `Ergebnis: ${outcome} (${bucket.dealCount} Deals)`,
    "",
    "Verdichte die folgenden Analysen zu uebertragbaren Lessons:",
    "",
    body,
  ].join("\n");

  let llm;
  try {
    llm = await deps.queryLLM(userPrompt, WINLOSS_SYSTEM_PROMPT, {
      temperature: TEMPERATURE,
      maxTokens: MAX_TOKENS,
    });
  } catch {
    return null; // fail-soft
  }

  if (!llm.success || !llm.data || llm.data.trim().length === 0) {
    return null;
  }
  return {
    markdown: llm.data.trim(),
    costUsd: safeCost(llm.usage, llm.modelId),
  };
}

/**
 * Klassifiziert Einwaende einer Branchen-Gruppe. null bei LLM-Fehler.
 */
export async function classifyObjections(
  group: ObjectionGroup,
  deps: DistillDeps = { queryLLM: defaultQueryLLM }
): Promise<DistillResult | null> {
  const body = clamp(
    group.notes.map((n, i) => `${i + 1}. ${redactPiiString(n)}`).join("\n")
  );
  const userPrompt = [
    `Branche: ${group.branche}`,
    `Anzahl Notizen: ${group.noteCount}`,
    "",
    "Klassifiziere die Einwaende aus diesen Notizen und fasse bewaehrte Reaktionen zusammen:",
    "",
    body,
  ].join("\n");

  let llm;
  try {
    llm = await deps.queryLLM(userPrompt, OBJECTION_SYSTEM_PROMPT, {
      temperature: TEMPERATURE,
      maxTokens: MAX_TOKENS,
    });
  } catch {
    return null;
  }

  if (!llm.success || !llm.data || llm.data.trim().length === 0) {
    return null;
  }
  return {
    markdown: llm.data.trim(),
    costUsd: safeCost(llm.usage, llm.modelId),
  };
}
