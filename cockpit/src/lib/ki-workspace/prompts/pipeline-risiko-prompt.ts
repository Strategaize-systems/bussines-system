import type { ExceptionData } from "@/app/(app)/mein-tag/actions";

export const PIPELINE_RISIKO_SYSTEM_PROMPT = `Du bist ein erfahrener Pipeline-Coach. Erstelle eine Risiko-Bewertung der aktuellen Pipeline auf Deutsch in genau dieser Reihenfolge und mit genau diesen drei Markdown-Sektionen:

## Risiko-Bewertung
## Wiedervorlagen
## KI-Kommentar

Regeln pro Sektion:
- Risiko-Bewertung: Pro Risiko-Indikator eine Zeile mit Schweregrad (hoch / mittel / niedrig) und kurzer Begruendung. Schwerpunkte: stagnierende Deals, ueberfaellige naechste Schritte, ueberfaellige Aufgaben mit Pipeline-Bezug.
- Wiedervorlagen: Konkrete Liste der Items, die JETZT eine Wiedervorlage brauchen. Pro Item: Titel + 1-Satz-Vorschlag fuer den naechsten Schritt (Anruf / Mail / Termin / Status-Check).
- KI-Kommentar: 1-3 Saetze. Welches Item soll als erstes angegangen werden und warum?

Schreibe direkt in Du-Form, sehr knapp, keine Einleitung, keine Schlussformel.
Wenn die Pipeline gesund ist (keine Risiko-Indikatoren): liefere alle drei Sektionen mit ehrlichen Hinweisen wie "Aktuell keine Risiko-Indikatoren — Pipeline laeuft sauber".`;

export interface PipelineRisikoInput {
  exceptions: ExceptionData;
}

export function buildPipelineRisikoPrompt(input: PipelineRisikoInput): string {
  const lines: string[] = [];
  const today = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  lines.push(`=== STAND: ${today} ===`);

  const totalIndicators =
    input.exceptions.stagnantDeals.length +
    input.exceptions.overdueTasks.length +
    input.exceptions.overdueDeals.length;

  lines.push(`\n=== ANZAHL RISIKO-INDIKATOREN: ${totalIndicators} ===`);

  lines.push("\n=== STAGNIERENDE DEALS (idle > 14 Tage) ===");
  if (input.exceptions.stagnantDeals.length === 0) {
    lines.push("Keine stagnierenden Deals.");
  } else {
    for (const d of input.exceptions.stagnantDeals) {
      const value = d.value != null ? `${d.value.toLocaleString("de-DE")} EUR` : "kein Wert";
      const stage = d.stage ?? "ohne Phase";
      const company = d.companyName ?? "ohne Firma";
      lines.push(
        `- ${d.title} (${value}, ${stage}, ${company}, ${d.daysSinceUpdate} Tage ohne Update)`,
      );
    }
  }

  lines.push("\n=== UEBERFAELLIGE NAECHSTE SCHRITTE (Deals) ===");
  if (input.exceptions.overdueDeals.length === 0) {
    lines.push("Keine ueberfaelligen naechsten Schritte.");
  } else {
    for (const d of input.exceptions.overdueDeals) {
      const company = d.companyName ?? "ohne Firma";
      lines.push(`- ${d.title} — ${d.nextAction} (faellig seit ${d.nextActionDate}, ${company})`);
    }
  }

  lines.push("\n=== UEBERFAELLIGE AUFGABEN ===");
  if (input.exceptions.overdueTasks.length === 0) {
    lines.push("Keine ueberfaelligen Aufgaben.");
  } else {
    for (const t of input.exceptions.overdueTasks) {
      const prio = t.priority ? ` [Prio ${t.priority}]` : "";
      const company = t.companyName ? ` — ${t.companyName}` : "";
      lines.push(`- ${t.title}${prio} (faellig seit ${t.dueDate}${company})`);
    }
  }

  lines.push(
    "\nErstelle die Risiko-Bewertung strikt mit den drei Sektionen in der oben definierten Reihenfolge. Verwende keine weiteren Sektionen. Antwortsprache: Deutsch.",
  );
  return lines.join("\n");
}
