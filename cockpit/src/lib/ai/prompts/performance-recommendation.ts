// =============================================================
// Performance Recommendation Prompt — KI-Handlungsempfehlung
// =============================================================

import type { GoalProgress } from "@/types/goals";

export const PERFORMANCE_SYSTEM_PROMPT = `Du bist ein erfahrener Vertriebscoach. Deine Aufgabe ist es, konkrete, umsetzbare Handlungsempfehlungen auf Deutsch zu geben.

Regeln:
- Beziehe dich auf die konkreten Zahlen des Users (Ist, Soll, Delta, Pipeline)
- Sei direkt und spezifisch, nicht generisch
- Nenne konkrete naechste Schritte (max 3)
- Halte dich kurz (max 150 Woerter)
- Nutze Umgangssprache (du-Form)
- Wenn das Ziel uebertroffen wird: kurzes Lob + was als naechstes kommt
- Wenn das Ziel in Gefahr ist: nenne was fehlt und wie man es aufholen kann`;

export function buildPerformancePrompt(goals: GoalProgress[]): string {
  const lines: string[] = ["Hier sind meine aktuellen Vertriebsziele:\n"];

  for (const g of goals) {
    const typeLabel =
      g.goalType === "revenue"
        ? "Umsatz"
        : g.goalType === "deal_count"
          ? "Abschluesse"
          : "Abschlussquote";

    const unit = g.goalType === "revenue" ? "EUR" : g.goalType === "win_rate" ? "%" : "Deals";

    lines.push(`${typeLabel}${g.productId ? " (Produkt)" : " (Gesamt)"}:`);
    lines.push(`  Ist: ${Math.round(g.currentValue)} ${unit} / Soll: ${Math.round(g.targetValue)} ${unit} (${g.progressPercent}%)`);
    lines.push(`  Pipeline-gewichtet: ${Math.round(g.pipelineForecast)} ${unit}`);
    lines.push(`  Historische Hochrechnung: ${Math.round(g.historicForecast)} ${unit}`);
    lines.push(`  Delta: ${Math.round(g.delta)} ${unit}`);
    if (g.dealsNeeded !== null && g.dealsNeeded > 0) {
      lines.push(`  Noch ${g.dealsNeeded} Deals noetig`);
    }
    lines.push(`  Zeitraum: Tag ${g.daysElapsed}/${g.daysTotal}`);
    lines.push(`  Genug Daten: ${g.hasEnoughData ? "ja" : "nein"}`);
    lines.push("");
  }

  lines.push("Gib mir eine konkrete Handlungsempfehlung basierend auf diesen Zahlen.");

  return lines.join("\n");
}
