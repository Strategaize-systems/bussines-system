// =============================================================
// Mein Tag Query — KI-Assistent Prompt
// =============================================================
//
// Processes natural language questions and instructions about
// the user's day: tasks, deals, meetings, contacts, priorities.

import type { MeinTagQueryContext } from "../types";

export const MEIN_TAG_QUERY_SYSTEM_PROMPT = `Du bist ein Business-Development-Assistent in einem operativen CRM-System.

Der Benutzer stellt dir Fragen oder gibt Anweisungen zu seinem Arbeitstag.
Du hast Zugriff auf seine heutigen Aufgaben, Top-Deals, Kalender-Termine, stagnierende Deals und ueberfaellige Aufgaben.

REGELN:
- Antworte auf Deutsch, kurz und praeziese.
- Beziehe dich immer auf die bereitgestellten Daten.
- Wenn die Frage nicht mit den verfuegbaren Daten beantwortet werden kann, sag das ehrlich.
- Nenne konkrete Namen, Zahlen und Daten aus dem Kontext.
- Formatiere die Antwort als JSON mit genau diesem Schema:

{
  "answer": "Direkte Antwort auf die Frage des Benutzers",
  "highlights": ["Relevanter Punkt 1", "Relevanter Punkt 2"],
  "suggestedAction": "Optionaler Vorschlag fuer naechste Aktion oder null"
}

- "highlights" ist ein Array mit den wichtigsten Datenpunkten (max 5).
- "suggestedAction" ist ein optionaler Vorschlag. Setze null wenn kein Vorschlag passt.
- Antworte NUR mit dem JSON-Objekt, kein zusaetzlicher Text.`;

export function buildMeinTagQueryPrompt(ctx: MeinTagQueryContext): string {
  const sections: string[] = [];

  sections.push(`FRAGE DES BENUTZERS: "${ctx.query}"`);

  if (ctx.todaysTasks.length > 0) {
    sections.push(
      `HEUTIGE AUFGABEN (${ctx.todaysTasks.length}):\n` +
      ctx.todaysTasks.map((t) => {
        const parts = [t.title];
        if (t.priority) parts.push(`Prio: ${t.priority}`);
        if (t.dueDate) parts.push(`Fällig: ${t.dueDate}`);
        if (t.contactName) parts.push(`Kontakt: ${t.contactName}`);
        if (t.companyName) parts.push(`Firma: ${t.companyName}`);
        return `- ${parts.join(" | ")}`;
      }).join("\n")
    );
  } else {
    sections.push("HEUTIGE AUFGABEN: Keine");
  }

  if (ctx.topDeals.length > 0) {
    sections.push(
      `TOP DEALS (${ctx.topDeals.length}):\n` +
      ctx.topDeals.map((d) => {
        const parts = [d.title];
        if (d.value) parts.push(`${d.value.toLocaleString("de-DE")} €`);
        if (d.stage) parts.push(`Phase: ${d.stage}`);
        if (d.companyName) parts.push(`Firma: ${d.companyName}`);
        if (d.nextAction) parts.push(`Nächste Aktion: ${d.nextAction}`);
        return `- ${parts.join(" | ")}`;
      }).join("\n")
    );
  } else {
    sections.push("TOP DEALS: Keine aktiven Deals");
  }

  if (ctx.calendarSlots.length > 0) {
    sections.push(
      `KALENDER HEUTE (${ctx.calendarSlots.length} Termine):\n` +
      ctx.calendarSlots.map((s) => `- ${s.time}: ${s.title} (${s.type})`).join("\n")
    );
  } else {
    sections.push("KALENDER HEUTE: Keine Termine");
  }

  if (ctx.stagnantDeals.length > 0) {
    sections.push(
      `STAGNIERENDE DEALS (${ctx.stagnantDeals.length}):\n` +
      ctx.stagnantDeals.map((d) => {
        const parts = [d.title, `${d.daysSinceUpdate} Tage ohne Update`];
        if (d.value) parts.push(`${d.value.toLocaleString("de-DE")} €`);
        if (d.stage) parts.push(`Phase: ${d.stage}`);
        return `- ${parts.join(" | ")}`;
      }).join("\n")
    );
  }

  if (ctx.overdueTasks.length > 0) {
    sections.push(
      `UEBERFAELLIGE AUFGABEN (${ctx.overdueTasks.length}):\n` +
      ctx.overdueTasks.map((t) => `- ${t.title} (fällig: ${t.dueDate})`).join("\n")
    );
  }

  return sections.join("\n\n");
}
