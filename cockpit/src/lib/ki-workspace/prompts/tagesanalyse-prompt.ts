import type { TodayItem, CalendarSlot, ExceptionData, TopDeal } from "@/app/(app)/mein-tag/actions";
import type { ActivityKpiStatus } from "@/types/activity-kpis";

export const TAGESANALYSE_SYSTEM_PROMPT = `Du bist ein persoenlicher Vertriebs-Assistent fuer einen B2B-Vertriebler.
Erstelle eine kompakte Tagesanalyse auf Deutsch in genau dieser Reihenfolge und mit genau diesen drei Markdown-Sektionen:

## Pipeline-Bewegung heute
## Aktivitaeten-Soll-Ist
## KI-Kommentar

Regeln pro Sektion:
- Pipeline-Bewegung heute: Haupt-KPI. 2-4 kurze Bullet-Points zu erwarteten Pipeline-Bewegungen heute (anstehende Meetings/Calls die einen Stage-Wechsel bewirken koennten, faellige naechste Schritte auf hochwertigen Deals, gestern verpasste Aufgaben mit Pipeline-Bezug).
- Aktivitaeten-Soll-Ist: Tabelle oder Bullets mit Ist/Soll pro KPI fuer heute. Wenn keine Targets gesetzt: "Keine Tages-Targets gesetzt" + Hinweis auf Verwaltung > Ziele.
- KI-Kommentar: 1-3 Saetze. Konkrete Empfehlung was JETZT als naechstes zu tun ist. Keine Floskeln.

Schreibe direkt in Du-Form, sehr knapp, keine Einleitung, keine Schlussformel.
Wenn die Datenbasis leer ist (keine Aufgaben/Meetings/Deals heute), liefere trotzdem alle drei Sektionen — nutze ehrliche Hinweise wie "Keine Aufgaben heute" statt frei erfundener Inhalte.`;

export interface TagesanalyseInput {
  items: TodayItem[];
  calendarSlots: CalendarSlot[];
  exceptions: ExceptionData;
  topDeals: TopDeal[];
  activityKpis: ActivityKpiStatus[];
  todayLabel?: string;
}

export function buildTagesanalysePrompt(input: TagesanalyseInput): string {
  const today =
    input.todayLabel ??
    new Date().toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const lines: string[] = [];
  lines.push(`=== TAG: ${today} ===`);

  lines.push("\n=== HEUTIGE AUFGABEN UND DEAL-AKTIONEN ===");
  if (input.items.length === 0) {
    lines.push("Keine offenen Eintraege fuer heute.");
  } else {
    for (const it of input.items) {
      const tags: string[] = [];
      if (it.priority) tags.push(`Prio ${it.priority}`);
      if (it.isOverdue) tags.push("ueberfaellig");
      if (it.dueDate) tags.push(`faellig ${it.dueDate}`);
      const tagStr = tags.length > 0 ? ` [${tags.join(", ")}]` : "";
      const ctx = [it.companyName, it.contactName, it.dealTitle].filter(Boolean).join(" / ");
      const ctxStr = ctx ? ` — ${ctx}` : "";
      lines.push(`- ${it.title}${tagStr}${ctxStr}`);
    }
  }

  lines.push("\n=== HEUTIGE TERMINE / MEETINGS ===");
  if (input.calendarSlots.length === 0) {
    lines.push("Keine Termine heute.");
  } else {
    for (const c of input.calendarSlots) {
      const sub = c.sub ? ` — ${c.sub}` : "";
      lines.push(`- ${c.time} ${c.type}: ${c.title}${sub}`);
    }
  }

  lines.push("\n=== TOP-DEALS (gewichtet) ===");
  if (input.topDeals.length === 0) {
    lines.push("Keine aktiven Top-Deals.");
  } else {
    for (const d of input.topDeals) {
      const value = d.value != null ? `${d.value.toLocaleString("de-DE")} EUR` : "kein Wert";
      const stage = d.stage ?? "ohne Phase";
      const next = d.nextAction ? ` | naechster Schritt: ${d.nextAction}` : "";
      lines.push(`- ${d.title} (${value}, ${stage}, ${d.probability}%)${next}`);
    }
  }

  lines.push("\n=== AKTIVITAETEN-KPI HEUTE (Ist / Soll) ===");
  if (input.activityKpis.length === 0) {
    lines.push("Keine Tages-Targets konfiguriert (Verwaltung > Ziele).");
  } else {
    for (const k of input.activityKpis) {
      lines.push(`- ${k.label}: ${k.todayActual} / ${k.dailyTarget}`);
    }
  }

  lines.push("\n=== STAGNIERENDE / UEBERFAELLIGE DEALS (Pipeline-Risiko-Indikatoren) ===");
  const stagnant = input.exceptions.stagnantDeals.slice(0, 5);
  const overdueDeals = input.exceptions.overdueDeals.slice(0, 5);
  if (stagnant.length === 0 && overdueDeals.length === 0) {
    lines.push("Aktuell keine Risiko-Indikatoren.");
  } else {
    for (const d of stagnant) {
      const value = d.value != null ? `${d.value.toLocaleString("de-DE")} EUR` : "kein Wert";
      lines.push(`- stagniert: ${d.title} (${value}, ${d.daysSinceUpdate} Tage ohne Update)`);
    }
    for (const d of overdueDeals) {
      lines.push(`- ueberfaelliger Schritt: ${d.title} — ${d.nextAction} (seit ${d.nextActionDate})`);
    }
  }

  lines.push(
    "\nErstelle die Tagesanalyse strikt mit den drei Sektionen in der oben definierten Reihenfolge. Verwende keine weiteren Sektionen. Antwortsprache: Deutsch.",
  );
  return lines.join("\n");
}
