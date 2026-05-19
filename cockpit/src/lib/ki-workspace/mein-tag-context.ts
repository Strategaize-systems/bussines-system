// V7.6 SLC-762 MT-3 — Mein-Tag-Datenkontext-Loader fuer Custom-Reports.
//
// Reuse-Quelle: cockpit/src/lib/ki-workspace/reports/tagesanalyse.ts und
// cockpit/src/lib/ki-workspace/prompts/tagesanalyse-prompt.ts (V7.5 SLC-705).
// Die 5 Read-Server-Actions werden weiterhin als Datenquelle benutzt — wir
// formattieren das Ergebnis aber zu einem generischen "Datenkontext"-Block,
// damit jedes User-prompt_template darueber gestellt werden kann.
//
// Defer V7.7+ (R2 Mitigation): Wenn weitere context_type-Loader hinzukommen,
// Mini-Refactor des Format-Codes in eine gemeinsame Helper-Schicht erwaegen.

import {
  getTodayItems,
  getCalendarEventsForToday,
  getExceptionData,
  getTopDeals,
} from "@/app/(app)/mein-tag/actions";
import { getDailyActivityKpis } from "@/app/actions/activity-kpis";

export async function loadMeinTagContextBlock(): Promise<string> {
  const [todayData, calendarSlots, exceptions, topDeals, activityKpis] =
    await Promise.all([
      getTodayItems(),
      getCalendarEventsForToday(),
      getExceptionData(),
      getTopDeals(5),
      getDailyActivityKpis(),
    ]);

  const items = [
    ...todayData.overdue,
    ...todayData.today,
    ...todayData.upcoming,
  ];

  const lines: string[] = [];
  const today = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  lines.push(`Tag: ${today}`);

  lines.push("");
  lines.push("Heutige Aufgaben und Deal-Aktionen:");
  if (items.length === 0) {
    lines.push("- keine offenen Eintraege heute");
  } else {
    for (const it of items) {
      const tags: string[] = [];
      if (it.priority) tags.push(`Prio ${it.priority}`);
      if (it.isOverdue) tags.push("ueberfaellig");
      if (it.dueDate) tags.push(`faellig ${it.dueDate}`);
      const tagStr = tags.length > 0 ? ` [${tags.join(", ")}]` : "";
      const ctx = [it.companyName, it.contactName, it.dealTitle]
        .filter(Boolean)
        .join(" / ");
      const ctxStr = ctx ? ` - ${ctx}` : "";
      lines.push(`- ${it.title}${tagStr}${ctxStr}`);
    }
  }

  lines.push("");
  lines.push("Heutige Termine / Meetings:");
  if (calendarSlots.length === 0) {
    lines.push("- keine Termine");
  } else {
    for (const c of calendarSlots) {
      const sub = c.sub ? ` - ${c.sub}` : "";
      lines.push(`- ${c.time} ${c.type}: ${c.title}${sub}`);
    }
  }

  lines.push("");
  lines.push("Top-Deals (gewichtet):");
  if (topDeals.length === 0) {
    lines.push("- keine aktiven Top-Deals");
  } else {
    for (const d of topDeals) {
      const value =
        d.value != null ? `${d.value.toLocaleString("de-DE")} EUR` : "kein Wert";
      const stage = d.stage ?? "ohne Phase";
      const next = d.nextAction ? ` | naechster Schritt: ${d.nextAction}` : "";
      lines.push(`- ${d.title} (${value}, ${stage}, ${d.probability}%)${next}`);
    }
  }

  lines.push("");
  lines.push("Aktivitaeten-KPI heute (Ist / Soll):");
  if (activityKpis.length === 0) {
    lines.push("- keine Tages-Targets konfiguriert");
  } else {
    for (const k of activityKpis) {
      lines.push(`- ${k.label}: ${k.todayActual} / ${k.dailyTarget}`);
    }
  }

  lines.push("");
  lines.push("Stagnierende / ueberfaellige Deals (Risiko-Indikatoren):");
  const stagnant = exceptions.stagnantDeals.slice(0, 5);
  const overdueDeals = exceptions.overdueDeals.slice(0, 5);
  if (stagnant.length === 0 && overdueDeals.length === 0) {
    lines.push("- aktuell keine Risiko-Indikatoren");
  } else {
    for (const d of stagnant) {
      const value =
        d.value != null ? `${d.value.toLocaleString("de-DE")} EUR` : "kein Wert";
      lines.push(
        `- stagniert: ${d.title} (${value}, ${d.daysSinceUpdate} Tage ohne Update)`
      );
    }
    for (const d of overdueDeals) {
      lines.push(
        `- ueberfaelliger Schritt: ${d.title} - ${d.nextAction} (seit ${d.nextActionDate})`
      );
    }
  }

  return lines.join("\n");
}
