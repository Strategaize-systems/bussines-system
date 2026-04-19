// =============================================================
// Signal Extraction Prompts + Zod Schema (SLC-432, MT-1)
// =============================================================
//
// One generic prompt for all signal types (DEC-051).
// Schema-based extraction via Zod enforces structure regardless
// of LLM output variation.

import { z } from "zod/v4";

// ── Zod Schema for Signal Extraction Response ─────────────────

export const SignalExtractionSchema = z.object({
  signals: z.array(
    z.object({
      type: z.enum([
        "stage_suggestion",
        "value_update",
        "tag_addition",
        "priority_change",
      ]),
      field: z.string(),
      current_value: z.string().nullable(),
      proposed_value: z.string(),
      confidence: z.number().min(0).max(1),
      reasoning: z.string().max(300),
    })
  ),
});

export type ExtractedSignal = z.infer<
  typeof SignalExtractionSchema
>["signals"][number];

// ── Deal context interface for signal extraction ──────────────

export interface SignalDealContext {
  dealId: string;
  dealName: string;
  stage?: string;
  value?: number;
  status?: string;
  contactName?: string;
  companyName?: string;
  nextAction?: string;
}

// ── System Prompt ─────────────────────────────────────────────

export const SIGNAL_EXTRACTION_SYSTEM_PROMPT = `Du bist ein erfahrener Business-Development-Analyst. Du analysierst Texte (Meeting-Zusammenfassungen oder E-Mails) und extrahierst daraus konkrete Vorschlaege fuer Aenderungen an Deal-Properties.

WICHTIG: Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt. Kein Text davor oder danach.

Das JSON muss exakt dieses Schema haben:
{
  "signals": [
    {
      "type": "stage_suggestion | value_update | tag_addition | priority_change",
      "field": "Name des Feldes (z.B. 'stage', 'value', 'tags', 'priority')",
      "current_value": "Aktueller Wert oder null wenn unbekannt",
      "proposed_value": "Vorgeschlagener neuer Wert",
      "confidence": 0.0 bis 1.0,
      "reasoning": "Kurze Begruendung (max 300 Zeichen)"
    }
  ]
}

SIGNAL-TYPEN:
- stage_suggestion: Der Text deutet darauf hin, dass der Deal in eine andere Phase wechseln sollte. Beispiel: "Wir haben das Angebot besprochen und der Kunde moechte verhandeln" → Stage-Wechsel zu "Verhandlung".
- value_update: Der Text enthaelt einen konkreten Betrag, der vom aktuellen Deal-Wert abweicht. Beispiel: "Budget liegt bei 75.000 Euro" wenn der Deal auf 50.000 steht.
- tag_addition: Der Text enthaelt geschaeftsrelevante Kategorisierungen, die als Tag erfasst werden sollten. Beispiel: "Compliance-Anforderungen vorhanden" → Tag "compliance".
- priority_change: Der Text deutet auf Dringlichkeit oder nachlassendes Interesse hin. Beispiel: "Kunde braucht Loesung bis Ende des Monats" → Priority "dringend".

REGELN:
- Nur Signale vorschlagen, die sich DIREKT aus dem Text ableiten lassen. Keine Spekulationen.
- Confidence-Score realistisch vergeben:
  * 0.9-1.0: Explizit im Text erwaehnt (z.B. "Budget ist 75k")
  * 0.7-0.8: Stark impliziert (z.B. "wir gehen in die Verhandlung")
  * 0.5-0.6: Moeglich aber nicht sicher (z.B. "klingt nach einer groesseren Sache")
  * unter 0.4: Reine Vermutung — NICHT vorschlagen
- Keine Signale vorschlagen, wenn der vorgeschlagene Wert dem aktuellen entspricht.
- Bei value_update: Nur vorschlagen wenn ein konkreter Betrag genannt wird, nicht bei vagen Andeutungen.
- Bei stage_suggestion: Die vorgeschlagene Stage muss eine der tatsaechlichen Pipeline-Stages sein.
- Wenn der Text keine verwertbaren Signale enthaelt, ein leeres Array zurueckgeben: {"signals": []}
- Maximal 5 Signale pro Analyse.`;

// ── User Prompt Builder ───────────────────────────────────────

export function buildSignalPrompt(
  sourceText: string,
  dealContext: SignalDealContext,
  ragContext?: string,
): string {
  const parts: string[] = [];

  // Deal context header
  parts.push("AKTUELLER DEAL-KONTEXT:");
  parts.push(`- Deal: ${dealContext.dealName}`);
  if (dealContext.stage) parts.push(`- Aktuelle Phase: ${dealContext.stage}`);
  if (dealContext.value != null)
    parts.push(`- Aktueller Wert: ${dealContext.value} EUR`);
  if (dealContext.status) parts.push(`- Status: ${dealContext.status}`);
  if (dealContext.contactName)
    parts.push(`- Kontakt: ${dealContext.contactName}`);
  if (dealContext.companyName)
    parts.push(`- Firma: ${dealContext.companyName}`);
  if (dealContext.nextAction)
    parts.push(`- Naechste Aktion: ${dealContext.nextAction}`);
  parts.push("");

  // Optional RAG context
  if (ragContext) {
    parts.push("ZUSAETZLICHER KONTEXT AUS DER WISSENSBASIS:");
    parts.push(ragContext);
    parts.push("");
  }

  // Source text
  parts.push("ZU ANALYSIERENDER TEXT:");
  parts.push(sourceText);

  return parts.join("\n");
}
