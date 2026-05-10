import type { GoalWithProgress } from "@/app/actions/goals";
import type { ActivityKpiStatus, WeekDayKpiStatus } from "@/types/activity-kpis";
import type { SnapshotComparison } from "@/app/actions/kpi-snapshots";
import type { KpiType } from "@/types/kpi-snapshots";

export const WOCHEN_PERFORMANCE_SYSTEM_PROMPT = `Du bist ein erfahrener Vertriebscoach. Erstelle eine Wochen-Performance-Analyse auf Deutsch in genau dieser Reihenfolge und mit genau diesen drei Markdown-Sektionen:

## Goal-Progress
## Aktivitaeten-Soll-Ist pro Tag
## KI-Empfehlung

Regeln pro Sektion:
- Goal-Progress: Pro Goal eine kompakte Zeile mit Ist/Soll/Progress%/Forecast/Delta. Wenn Pro-Produkt-Goals vorhanden: kurze Sub-Liste. Wenn Trend-Daten vorhanden: 1 Satz "vs. Vorperiode".
- Aktivitaeten-Soll-Ist pro Tag: Tabelle oder Bullets pro KPI, Zeile zeigt Mo/Di/Mi/Do/Fr Werte vs Tages-Soll. Markiere Tage, die das Soll erreichen mit OK, knapp daneben mit ~, deutlich darunter mit !.
- KI-Empfehlung: Konkrete naechste Schritte (max 3) basierend auf den Zahlen. Kein Lob ohne Datenbezug. Wenn ein Goal in Gefahr: nenne was fehlt und wie es aufgeholt werden kann. Wenn uebertroffen: kurzes Lob + Vorschlag fuers naechste Ziel-Niveau.

Schreibe direkt in Du-Form, sehr knapp, keine Einleitung, keine Schlussformel.
Wenn keine Goals konfiguriert sind: liefere eine einzige Sektion "## Hinweis" mit "Lege zuerst Ziele unter Verwaltung > Ziele an."`;

export interface TrendEntry {
  label: string;
  kpiType: KpiType;
  unit: string;
  comparison: SnapshotComparison;
}

export interface WochenPerformanceInput {
  goalsWithProgress: GoalWithProgress[];
  todayActivityKpis: ActivityKpiStatus[];
  weeklyActivityKpis: WeekDayKpiStatus[];
  trendComparisons: TrendEntry[];
}

function formatGoalLine(g: GoalWithProgress): string {
  const typeLabel =
    g.type === "revenue" ? "Umsatz" : g.type === "deal_count" ? "Abschluesse" : "Abschlussquote";
  const unit = g.type === "revenue" ? "EUR" : g.type === "win_rate" ? "%" : "Deals";
  const p = g.progress;
  const lines: string[] = [];
  const productSuffix = g.product_id ? ` (${g.product_name ?? "Produkt"})` : " (Gesamt)";
  lines.push(`- ${typeLabel}${productSuffix}:`);
  lines.push(
    `    Ist ${Math.round(p.currentValue)} ${unit} / Soll ${Math.round(p.targetValue)} ${unit} (${p.progressPercent}%)`,
  );
  lines.push(
    `    Pipeline-Forecast ${Math.round(p.pipelineForecast)} ${unit}, historische Hochrechnung ${Math.round(p.historicForecast)} ${unit}, Delta ${Math.round(p.delta)} ${unit}`,
  );
  if (p.dealsNeeded !== null && p.dealsNeeded > 0) {
    lines.push(`    Noch ${p.dealsNeeded} Deals noetig`);
  }
  lines.push(
    `    Zeitraum: Tag ${p.daysElapsed}/${p.daysTotal}, Datenbasis ${p.hasEnoughData ? "ausreichend" : "noch zu duenn"}`,
  );
  return lines.join("\n");
}

export function buildWochenPerformancePrompt(input: WochenPerformanceInput): string {
  const lines: string[] = [];
  const today = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  lines.push(`=== STAND: ${today} ===`);

  if (input.goalsWithProgress.length === 0) {
    lines.push("\n=== KEINE GOALS KONFIGURIERT ===");
    lines.push(
      "Es gibt keine aktiven Goals fuer den aktuellen Zeitraum. Liefere eine einzige Sektion '## Hinweis' wie im System-Prompt beschrieben.",
    );
    return lines.join("\n");
  }

  const overallGoals = input.goalsWithProgress.filter((g) => !g.product_id);
  const productGoals = input.goalsWithProgress.filter((g) => g.product_id);

  lines.push("\n=== GOAL-PROGRESS — GESAMT ===");
  for (const g of overallGoals) {
    lines.push(formatGoalLine(g));
  }
  if (productGoals.length > 0) {
    lines.push("\n=== GOAL-PROGRESS — PRO PRODUKT ===");
    for (const g of productGoals) {
      lines.push(formatGoalLine(g));
    }
  }

  lines.push("\n=== TREND VS. VORPERIODE ===");
  if (input.trendComparisons.length === 0) {
    lines.push("Keine Trend-Daten vorhanden (noch nicht genug KPI-Snapshots).");
  } else {
    for (const t of input.trendComparisons) {
      const cur = Math.round(t.comparison.current);
      const prev = Math.round(t.comparison.previous);
      let change = "kein Vergleich";
      if (t.comparison.changePercent !== null) {
        const sign = t.comparison.changePercent >= 0 ? "+" : "";
        change =
          t.unit === "%"
            ? `${cur - prev >= 0 ? "+" : ""}${cur - prev}pp`
            : `${sign}${t.comparison.changePercent}%`;
      }
      lines.push(`- ${t.label}: ${cur} ${t.unit} (Vorperiode ${prev} ${t.unit}, ${change})`);
    }
  }

  lines.push("\n=== AKTIVITAETEN HEUTE (Ist / Soll) ===");
  if (input.todayActivityKpis.length === 0) {
    lines.push("Keine Tages-Targets konfiguriert.");
  } else {
    for (const k of input.todayActivityKpis) {
      lines.push(`- ${k.label}: ${k.todayActual} / ${k.dailyTarget}`);
    }
  }

  lines.push("\n=== AKTIVITAETEN WOCHE (Mo-Fr Ist vs Soll pro Tag) ===");
  if (input.weeklyActivityKpis.length === 0) {
    lines.push("Keine Wochen-Tages-Targets konfiguriert.");
  } else {
    for (const k of input.weeklyActivityKpis) {
      const dayLines = k.days
        .map((d) => `${d.dayLabel} ${d.actual}/${k.dailyTarget}${d.isToday ? "*" : ""}`)
        .join(" | ");
      lines.push(`- ${k.label}: ${dayLines}`);
    }
  }

  lines.push(
    "\nErstelle die Wochen-Performance strikt mit den drei Sektionen in der oben definierten Reihenfolge. Verwende keine weiteren Sektionen. Antwortsprache: Deutsch.",
  );
  return lines.join("\n");
}
