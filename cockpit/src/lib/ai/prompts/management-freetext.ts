// =============================================================
// Management Freetext Query — Natural language → structured answer
// =============================================================

import type { ManagementFreetextContext } from "../types";

export const MANAGEMENT_FREETEXT_SYSTEM_PROMPT = `Du bist ein Analyse-Assistent fuer ein B2B Business Development System.

Der Benutzer stellt eine Frage in natuerlicher Sprache. Du erhaeltst die relevanten Geschaeftsdaten als Kontext und sollst die Frage praezise beantworten.

Regeln:
- Schreibe auf Deutsch
- Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt
- Beantworte die Frage direkt und konkret
- Nenne spezifische Zahlen, Namen, Deals wo moeglich
- Wenn die Daten nicht ausreichen um die Frage zu beantworten, sage das ehrlich
- Gib immer an, welche Datenquellen du fuer die Antwort verwendet hast

Antworte mit diesem JSON-Schema:
{
  "answer": "Direkte Antwort auf die Frage in 2-5 Saetzen",
  "highlights": ["Wichtiger Datenpunkt 1", "Wichtiger Datenpunkt 2", ...],
  "dataPoints": [
    { "label": "Kennzahl", "value": "Wert als String" }
  ],
  "suggestedFollowUp": "Vorgeschlagene Folgefrage oder null",
  "dataSources": ["Tabelle/Bereich 1", "Tabelle/Bereich 2"],
  "confidence": 0-100
}`;

export function buildManagementFreetextPrompt(
  context: ManagementFreetextContext
): string {
  const sections: string[] = [];

  sections.push(`=== FRAGE ===\n${context.query}`);

  if (context.deals && context.deals.length > 0) {
    const dealLines = context.deals.slice(0, 50).map((d) =>
      `- ${d.title} | Wert: ${d.value ?? "k.A."} | Stage: ${d.stage ?? "k.A."} | Status: ${d.status} | Firma: ${d.company ?? "k.A."} | Letztes Update: ${d.lastUpdate ?? "k.A."}`
    );
    sections.push(`=== DEALS (${context.deals.length}) ===\n${dealLines.join("\n")}`);
  }

  if (context.activities && context.activities.length > 0) {
    const actLines = context.activities.slice(0, 30).map((a) =>
      `- ${a.date}: ${a.type} — ${a.title}${a.dealTitle ? ` (Deal: ${a.dealTitle})` : ""}`
    );
    sections.push(`=== AKTIVITAETEN (letzte ${context.activities.length}) ===\n${actLines.join("\n")}`);
  }

  if (context.stats) {
    sections.push(`=== STATISTIKEN ===
- Offene Deals: ${context.stats.openDeals}
- Pipeline-Wert gesamt: ${context.stats.totalPipelineValue}
- Gewonnene Deals: ${context.stats.wonDeals ?? "k.A."}
- Verlorene Deals: ${context.stats.lostDeals ?? "k.A."}
- Kontakte: ${context.stats.totalContacts}
- Firmen: ${context.stats.totalCompanies}`);
  }

  if (context.stages && context.stages.length > 0) {
    const stageLines = context.stages.map((s) =>
      `- ${s.name}: ${s.dealCount} Deals, Wert: ${s.totalValue}`
    );
    sections.push(`=== PIPELINE-STAGES ===\n${stageLines.join("\n")}`);
  }

  sections.push("=== AUFGABE ===\nBeantworte die obige Frage basierend auf den bereitgestellten Daten als strukturiertes JSON.");

  return sections.join("\n\n");
}
