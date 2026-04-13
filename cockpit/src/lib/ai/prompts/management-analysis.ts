// =============================================================
// Management Analysis Prompts — 5 predefined analysis types
// =============================================================

import type { ManagementAnalysisContext } from "../types";

export const MANAGEMENT_ANALYSIS_SYSTEM_PROMPT = `Du bist ein erfahrener Business-Analyse-Assistent fuer ein B2B Business Development System.

Du erhaeltst Geschaeftsdaten und sollst eine praezise, handlungsorientierte Analyse liefern.

Regeln:
- Schreibe auf Deutsch
- Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt
- Verwende keine Umlaute in JSON-Keys
- Sei konkret und nenne Zahlen wo moeglich
- Unterscheide zwischen Fakten (aus den Daten) und Empfehlungen (deine Einschaetzung)
- Wenn Daten fehlen, sage das ehrlich statt zu spekulieren

Antworte mit diesem JSON-Schema:
{
  "title": "Analyse-Titel",
  "summary": "Zusammenfassung in 2-3 Saetzen",
  "insights": ["Erkenntnis 1", "Erkenntnis 2", ...],
  "recommendations": ["Empfehlung 1", "Empfehlung 2", ...],
  "dataPoints": [
    { "label": "Kennzahl-Name", "value": "Wert als String", "trend": "up" | "down" | "stable" | "unknown" }
  ],
  "confidence": 0-100,
  "dataSources": ["Tabelle/Datenquelle 1", "Tabelle/Datenquelle 2"]
}`;

export type ManagementAnalysisType =
  | "pipeline-health"
  | "multiplikator-ranking"
  | "forecast"
  | "win-loss"
  | "activity-analysis";

const ANALYSIS_INSTRUCTIONS: Record<ManagementAnalysisType, string> = {
  "pipeline-health": `Analysiere die Pipeline-Gesundheit:
- Verteilung der Deals ueber die Stages (sind Engpaesse erkennbar?)
- Stagnierende Deals (>14 Tage ohne Update)
- Deals ohne naechste Aktion
- Durchschnittlicher Deal-Wert pro Stage
- Conversion-Potential (gewichteter Forecast)
- Risiken: Deals mit hohem Wert in fruehen Stages, ueberfaellige Aktionen`,

  "multiplikator-ranking": `Analysiere die Multiplikator-Performance:
- Ranking nach Empfehlungsqualitaet (Deals die aus Empfehlungen entstanden)
- Vertrauenslevel-Verteilung
- Aktivste Multiplikatoren (letzte 30 Tage)
- Multiplikatoren ohne aktive Deals
- Empfehlung: Welche Multiplikatoren sollten priorisiert kontaktiert werden?`,

  "forecast": `Erstelle eine Umsatz-Prognose:
- Gewichteter Forecast (Deal-Wert × Stage-Wahrscheinlichkeit)
- Forecast nach Zeitraum (diesen Monat, naechsten Monat, Quartal)
- Best-Case vs. Worst-Case Szenario
- Groesste Einzelposten im Forecast
- Risiko-adjustierter Forecast (Berücksichtigung von Stagnation)`,

  "win-loss": `Analysiere Gewinn/Verlust-Muster:
- Gewonnene vs. verlorene Deals (Anzahl und Wert)
- Durchschnittliche Zeit bis zum Abschluss
- In welchen Stages gehen die meisten Deals verloren?
- Welche Firmentypen/Branchen sind am erfolgreichsten?
- Loss-Gruende falls dokumentiert
- Trends: Wird die Win-Rate besser oder schlechter?`,

  "activity-analysis": `Analysiere die Aktivitaets-Intensitaet:
- Aktivitaeten pro Woche (Trend)
- Verteilung nach Aktivitaets-Typ (Calls, Meetings, E-Mails, Tasks)
- Deals ohne Aktivitaet in den letzten 7/14/30 Tagen
- Durchschnittliche Aktivitaeten pro Deal bis zum Abschluss
- Zeiten mit hoher vs. niedriger Aktivitaet
- Empfehlung: Wo fehlt Aktivitaet am meisten?`,
};

export function buildManagementAnalysisPrompt(
  context: ManagementAnalysisContext
): string {
  const instruction = ANALYSIS_INSTRUCTIONS[context.analysisType as ManagementAnalysisType]
    || "Erstelle eine allgemeine Geschaeftsanalyse.";

  const sections: string[] = [];

  sections.push(`=== ANALYSE-AUFTRAG ===\n${instruction}`);

  if (context.deals && context.deals.length > 0) {
    const dealLines = context.deals.map((d) =>
      `- ${d.title} | Wert: ${d.value ?? "k.A."} | Stage: ${d.stage ?? "k.A."} | Wahrscheinlichkeit: ${d.probability ?? "k.A."}% | Letztes Update: ${d.lastUpdate ?? "k.A."} | Status: ${d.status}`
    );
    sections.push(`=== DEALS (${context.deals.length}) ===\n${dealLines.join("\n")}`);
  }

  if (context.activities && context.activities.length > 0) {
    const actLines = context.activities.map((a) =>
      `- ${a.date}: ${a.type} — ${a.title}${a.dealTitle ? ` (Deal: ${a.dealTitle})` : ""}`
    );
    sections.push(`=== AKTIVITAETEN (${context.activities.length}) ===\n${actLines.join("\n")}`);
  }

  if (context.multiplikatoren && context.multiplikatoren.length > 0) {
    const multLines = context.multiplikatoren.map((m) =>
      `- ${m.name} | Vertrauen: ${m.trustLevel ?? "k.A."}/10 | Firma: ${m.company ?? "k.A."} | Empfehlungen: ${m.referralCount ?? 0}`
    );
    sections.push(`=== MULTIPLIKATOREN (${context.multiplikatoren.length}) ===\n${multLines.join("\n")}`);
  }

  if (context.stages && context.stages.length > 0) {
    const stageLines = context.stages.map((s) =>
      `- ${s.name}: ${s.dealCount} Deals, Wert: ${s.totalValue}, Wahrscheinlichkeit: ${s.probability}%`
    );
    sections.push(`=== PIPELINE-STAGES ===\n${stageLines.join("\n")}`);
  }

  if (context.stats) {
    sections.push(`=== STATISTIKEN ===
- Offene Deals: ${context.stats.openDeals}
- Pipeline-Wert: ${context.stats.totalPipelineValue}
- Gewonnene Deals (gesamt): ${context.stats.wonDeals ?? "k.A."}
- Verlorene Deals (gesamt): ${context.stats.lostDeals ?? "k.A."}
- Kontakte: ${context.stats.totalContacts}
- Firmen: ${context.stats.totalCompanies}`);
  }

  sections.push("=== AUFGABE ===\nErstelle die angeforderte Analyse als strukturiertes JSON.");

  return sections.join("\n\n");
}
