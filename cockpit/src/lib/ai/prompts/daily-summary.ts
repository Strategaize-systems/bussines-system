// =============================================================
// Daily Summary Prompt — Generates personalized daily overview
// =============================================================

import type { DailySummaryContext } from "../types";

/**
 * System prompt that instructs the LLM to produce structured JSON output
 * in German for a daily summary / "Mein Tag" briefing.
 */
export const DAILY_SUMMARY_SYSTEM_PROMPT = `Du bist ein persoenlicher Business Development Assistent. Deine Aufgabe ist es, eine strukturierte Tageszusammenfassung auf Deutsch zu erstellen.

WICHTIG: Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt. Kein Text davor oder danach.

Das JSON muss exakt dieses Schema haben:
{
  "greeting": "Persoenliche Begruessung mit Kontext zum Tag",
  "priorities": ["Prioritaet 1", "Prioritaet 2", ...],
  "meetingPrep": ["Vorbereitung Meeting 1", "Vorbereitung Meeting 2", ...],
  "warnings": ["Warnung 1", "Warnung 2", ...],
  "suggestedFocus": "Empfohlener Fokus fuer heute"
}

Regeln:
- greeting: Kurze, freundliche Begruessung mit Bezug zum Tagesinhalt UND zum Vortag (1-2 Saetze). Wenn gestern viel erledigt wurde, erwaehne das positiv. Wenn Aufgaben verpasst wurden, erwaehne das konstruktiv.
- priorities: Die wichtigsten Aufgaben fuer heute, nach Dringlichkeit sortiert (3-5 Punkte). Beruecksichtige gestern verpasste Aufgaben mit hoeherer Prioritaet.
- meetingPrep: Konkrete Vorbereitungshinweise fuer anstehende Meetings (pro Meeting 1 Punkt)
- warnings: Warnungen zu stagnierten Deals, ueberfaelligen Items, Risiken, UND ungesehene Ereignisse die Aufmerksamkeit erfordern (0-5 Punkte)
- suggestedFocus: Ein konkreter Vorschlag, worauf heute der Hauptfokus liegen sollte (1 Satz). Beziehe den Vortag ein — z.B. wenn gestern wichtige Items verpasst wurden, koennten die heute Prioritaet haben.

Falls keine Meetings anstehen, setze meetingPrep auf ein leeres Array [].
Falls keine Warnungen noetig sind, setze warnings auf ein leeres Array [].

Schreibe auf Deutsch. Sei konkret, motivierend und praxisnah.`;

/**
 * Builds the user prompt with the daily context data.
 */
export function buildDailySummaryPrompt(context: DailySummaryContext): string {
  const parts: string[] = [];

  const today = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  parts.push(`=== TAGESKONTEXT: ${today} ===`);

  // Today's tasks
  if (context.todaysTasks && context.todaysTasks.length > 0) {
    parts.push("\n=== HEUTIGE AUFGABEN ===");
    for (const task of context.todaysTasks) {
      const details = [task.title];
      if (task.priority) details.push(`[${task.priority}]`);
      if (task.dueDate) details.push(`Faellig: ${task.dueDate}`);
      parts.push(`- ${details.join(" | ")}`);
    }
  } else {
    parts.push("\n=== HEUTIGE AUFGABEN ===");
    parts.push("Keine spezifischen Aufgaben fuer heute geplant.");
  }

  // Upcoming meetings
  if (context.upcomingMeetings && context.upcomingMeetings.length > 0) {
    parts.push("\n=== ANSTEHENDE MEETINGS ===");
    for (const meeting of context.upcomingMeetings) {
      const details = [`${meeting.time}: ${meeting.title}`];
      if (meeting.attendees && meeting.attendees.length > 0) {
        details.push(`Teilnehmer: ${meeting.attendees.join(", ")}`);
      }
      if (meeting.dealName) {
        details.push(`Deal: ${meeting.dealName}`);
      }
      parts.push(`- ${details.join(" | ")}`);
    }
  } else {
    parts.push("\n=== ANSTEHENDE MEETINGS ===");
    parts.push("Keine Meetings fuer heute geplant.");
  }

  // Stagnant deals
  if (context.stagnantDeals && context.stagnantDeals.length > 0) {
    parts.push("\n=== STAGNIERENDE DEALS ===");
    for (const deal of context.stagnantDeals) {
      const details = [
        `${deal.name}: ${deal.daysSinceLastActivity} Tage ohne Aktivitaet`,
      ];
      if (deal.value !== undefined) {
        details.push(`Wert: ${deal.value.toLocaleString("de-DE")} EUR`);
      }
      if (deal.stage) details.push(`Phase: ${deal.stage}`);
      parts.push(`- ${details.join(" | ")}`);
    }
  }

  // Overdue items
  if (context.overdueItems && context.overdueItems.length > 0) {
    parts.push("\n=== UEBERFAELLIGE ITEMS ===");
    for (const item of context.overdueItems) {
      parts.push(
        `- ${item.title} (${item.type}) | Faellig seit: ${item.dueDate}`
      );
    }
  }

  // Yesterday's review
  if (context.yesterdayCompleted && context.yesterdayCompleted.length > 0) {
    parts.push("\n=== GESTERN ERLEDIGT ===");
    for (const item of context.yesterdayCompleted) {
      parts.push(`- [${item.type}] ${item.title}`);
    }
  }

  if (context.yesterdayMissed && context.yesterdayMissed.length > 0) {
    parts.push("\n=== GESTERN NICHT ERLEDIGT ===");
    for (const item of context.yesterdayMissed) {
      parts.push(`- ${item.title}`);
    }
  } else if (context.yesterdayCompleted && context.yesterdayCompleted.length > 0) {
    parts.push("\n=== GESTERN NICHT ERLEDIGT ===");
    parts.push("Alles erledigt — gute Arbeit!");
  }

  // Unseen events
  if (context.unseenEvents && context.unseenEvents.length > 0) {
    parts.push("\n=== UNGESEHENE EREIGNISSE ===");
    for (const evt of context.unseenEvents) {
      parts.push(`- [${evt.type}] ${evt.description}`);
    }
  }

  parts.push("\n=== AUFGABE ===");
  parts.push(
    "Erstelle eine strukturierte Tageszusammenfassung basierend auf den obigen Daten. Beziehe den Vortag und ungesehene Ereignisse ein. Antworte ausschliesslich mit dem JSON-Objekt."
  );

  return parts.join("\n");
}
