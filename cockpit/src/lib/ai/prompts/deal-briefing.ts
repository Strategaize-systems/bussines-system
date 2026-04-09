// =============================================================
// Deal Briefing Prompt — Generates structured deal analysis
// =============================================================

import type { DealBriefingContext } from "../types";

/**
 * System prompt that instructs the LLM to produce structured JSON output
 * in German for a deal briefing.
 */
export const DEAL_BRIEFING_SYSTEM_PROMPT = `Du bist ein erfahrener Business Development Assistent. Deine Aufgabe ist es, strukturierte Deal-Briefings auf Deutsch zu erstellen.

WICHTIG: Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt. Kein Text davor oder danach.

Das JSON muss exakt dieses Schema haben:
{
  "summary": "Zusammenfassung der Deal-Situation in 2-3 Saetzen",
  "keyFacts": ["Fakt 1", "Fakt 2", ...],
  "openRisks": ["Risiko 1", "Risiko 2", ...],
  "suggestedNextSteps": ["Naechster Schritt 1", "Naechster Schritt 2", ...],
  "confidence": 75
}

Regeln:
- summary: Klare, praegnante Zusammenfassung der aktuellen Deal-Situation
- keyFacts: Die wichtigsten Fakten zum Deal (3-7 Punkte)
- openRisks: Identifizierte Risiken und offene Punkte (mindestens 1)
- suggestedNextSteps: Konkrete, actionable naechste Schritte (2-5 Punkte)
- confidence: Zahl 0-100, basierend auf Datenvollstaendigkeit und Deal-Gesundheit
  - 0-30: Wenig Daten, hohe Unsicherheit
  - 31-60: Grunddaten vorhanden, einige Luecken
  - 61-80: Gute Datenlage, klare Situation
  - 81-100: Umfassende Daten, klare Einschaetzung moeglich

Schreibe auf Deutsch. Sei konkret und actionable.`;

/**
 * Builds the user prompt with the deal context data.
 */
export function buildDealBriefingPrompt(context: DealBriefingContext): string {
  const parts: string[] = [];

  // Deal core data
  parts.push("=== DEAL-DATEN ===");
  parts.push(`Name: ${context.deal.name}`);
  if (context.deal.value !== undefined) {
    parts.push(`Wert: ${context.deal.value.toLocaleString("de-DE")} EUR`);
  }
  if (context.deal.stage) {
    parts.push(`Phase: ${context.deal.stage}`);
  }
  if (context.deal.probability !== undefined) {
    parts.push(`Wahrscheinlichkeit: ${context.deal.probability}%`);
  }
  if (context.deal.expectedCloseDate) {
    parts.push(`Erwarteter Abschluss: ${context.deal.expectedCloseDate}`);
  }
  if (context.deal.notes) {
    parts.push(`Notizen: ${context.deal.notes}`);
  }

  // Contacts
  if (context.contacts && context.contacts.length > 0) {
    parts.push("\n=== KONTAKTE ===");
    for (const contact of context.contacts) {
      const details = [contact.name];
      if (contact.role) details.push(`(${contact.role})`);
      if (contact.company) details.push(`bei ${contact.company}`);
      parts.push(`- ${details.join(" ")}`);
    }
  }

  // Activities
  if (context.activities && context.activities.length > 0) {
    parts.push("\n=== AKTIVITAETEN (neueste zuerst) ===");
    for (const activity of context.activities) {
      parts.push(`- ${activity.date} | ${activity.type}: ${activity.subject}`);
      if (activity.notes) {
        parts.push(`  Notizen: ${activity.notes}`);
      }
    }
  }

  // Proposals
  if (context.proposals && context.proposals.length > 0) {
    parts.push("\n=== ANGEBOTE ===");
    for (const proposal of context.proposals) {
      const details = [proposal.title];
      if (proposal.value !== undefined) {
        details.push(`${proposal.value.toLocaleString("de-DE")} EUR`);
      }
      if (proposal.status) details.push(`(${proposal.status})`);
      if (proposal.date) details.push(`vom ${proposal.date}`);
      parts.push(`- ${details.join(" | ")}`);
    }
  }

  parts.push("\n=== AUFGABE ===");
  parts.push(
    "Erstelle ein strukturiertes Deal-Briefing basierend auf den obigen Daten. Antworte ausschliesslich mit dem JSON-Objekt."
  );

  return parts.join("\n");
}
