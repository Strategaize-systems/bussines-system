// SLC-666 — Pure-Function-Prompt-Builders fuer die 6 Cockpit-Reports.
// Alle Funktionen sind testbar ohne DB/Bedrock.

import type { CockpitContext, CockpitDeal } from "@/lib/ki-workspace/cockpit-context";

const SHARED_SYSTEM_PROMPT_PREAMBLE = `Du bist ein KI-Analyse-Cockpit fuer die Geschaeftsleitung eines B2B-Vertriebs.
Antworte auf Deutsch in kompaktem Markdown. Keine Einleitung, keine Floskeln.
Verwende nur die Zahlen und Fakten aus dem bereitgestellten Kontext.
Wenn die Datenbasis leer ist, sage das ehrlich statt zu erfinden.`;

// =============================================================
// 1. Pipeline-Snapshot — Stages × (Anzahl + Wert)
// =============================================================

export const PIPELINE_SNAPSHOT_SYSTEM_PROMPT = `${SHARED_SYSTEM_PROMPT_PREAMBLE}

Erstelle einen Pipeline-Snapshot in genau dieser Struktur:

## Pipeline-Snapshot
Pro Pipeline eine Sub-Sektion "### {Pipeline-Name}" mit Bullet-Liste je Stage:
- {Stage-Name}: {Anzahl Deals} Deals · {Summe} EUR (Wahrscheinlichkeit {n}%)

## KI-Kommentar
2-3 Saetze: Wo staut sich Pipeline, wo ist Bewegung, was ist die naechste sinnvolle Aktion fuer die Geschaeftsleitung.`;

export function buildPipelineSnapshotPrompt(ctx: CockpitContext): string {
  const active = ctx.deals.filter((d) => d.status === "active");
  const byPipeline = groupBy(active, (d) => d.pipeline_id ?? "ohne_pipeline");

  const lines: string[] = [];
  lines.push(`=== STAND: ${ctx.generatedAt.split("T")[0]} ===`);
  lines.push(`Aktive Deals gesamt: ${active.length}`);
  lines.push("");

  for (const pipeline of ctx.pipelines) {
    const dealsInPipeline = byPipeline.get(pipeline.id) ?? [];
    lines.push(`=== PIPELINE: ${pipeline.name} (${dealsInPipeline.length} aktive Deals) ===`);
    const byStage = groupBy(dealsInPipeline, (d) => d.stage_id ?? "ohne_stage");
    for (const [, stageDeals] of byStage) {
      const stageName = stageDeals[0].stage_name ?? "(ohne Stage)";
      const sum = stageDeals.reduce((s, d) => s + (d.value ?? 0), 0);
      const probability = stageDeals[0].probability;
      lines.push(
        `- ${stageName}: ${stageDeals.length} Deals · ${formatEUR(sum)} (Wahrscheinlichkeit ${probability}%)`,
      );
    }
    lines.push("");
  }

  lines.push("Erstelle den Pipeline-Snapshot strikt mit den oben definierten Sektionen.");
  return lines.join("\n");
}

// =============================================================
// 2. Top-Chancen — Pro Pipeline Top-10, Bedrock-Output mit Sektion-Header
// =============================================================

export const TOP_CHANCEN_SYSTEM_PROMPT = `${SHARED_SYSTEM_PROMPT_PREAMBLE}

Erstelle eine Top-Chancen-Liste in genau dieser Struktur:

## Top-Chancen
Pro Pipeline EINE Sub-Sektion mit GENAU diesem Header-Format:
## Pipeline: {Pipeline-Name}
Darunter Bullet-Liste der wichtigsten Deals (max 10) mit:
- {Deal-Titel} — {Firma} · {Wert} EUR · Wahrscheinlichkeit {n}% — {1 Satz Begruendung warum vielversprechend}

WICHTIG: Die "## Pipeline: ..."-Header werden vom Frontend als Tab-Marker geparst. Halte das Format strikt ein.

Am Ende EIN gemeinsamer Block:

## KI-Kommentar
2-3 Saetze: Welche Pipeline hat die hoechsten Erfolgschancen, wo gibt es bewegliche Deals.`;

export function buildTopChancenPrompt(ctx: CockpitContext): string {
  const active = ctx.deals.filter((d) => d.status === "active");
  const lines: string[] = [];
  lines.push(`=== STAND: ${ctx.generatedAt.split("T")[0]} ===`);
  lines.push("");

  for (const pipeline of ctx.pipelines) {
    const dealsInPipeline = active
      .filter((d) => d.pipeline_id === pipeline.id)
      .map((d) => ({ ...d, weighted: (d.value ?? 0) * d.probability }))
      .sort((a, b) => b.weighted - a.weighted)
      .slice(0, 10);

    lines.push(`=== PIPELINE: ${pipeline.name} ===`);
    if (dealsInPipeline.length === 0) {
      lines.push("Keine aktiven Deals in dieser Pipeline.");
    } else {
      for (const d of dealsInPipeline) {
        const company = d.company_name ?? "ohne Firma";
        const value = d.value != null ? `${formatEUR(d.value)}` : "kein Wert";
        const next = d.next_action ? ` | naechster Schritt: ${d.next_action}` : "";
        const lastActivity = d.last_activity_at
          ? ` | letzte Aktivitaet: ${d.last_activity_at.split("T")[0]}`
          : "";
        lines.push(
          `- ${d.title} (${company}, ${value}, ${d.stage_name ?? "ohne Stage"}, ${d.probability}%)${next}${lastActivity}`,
        );
      }
    }
    lines.push("");
  }

  lines.push("Antworte strikt im definierten Format mit '## Pipeline: ...'-Headern pro Pipeline-Sektion.");
  return lines.join("\n");
}

// =============================================================
// 3. Conversion-Rate — Won/Lost-Verhaeltnis + Stage-Conversion-Hints
// =============================================================

export const CONVERSION_RATE_SYSTEM_PROMPT = `${SHARED_SYSTEM_PROMPT_PREAMBLE}

Erstelle eine Conversion-Analyse in genau dieser Struktur:

## Conversion-Rate (90 Tage)
- Gewonnen: {n} ({Summe} EUR)
- Verloren: {n} ({Summe} EUR)
- Win-Rate: {Prozent}

## Pro Pipeline
Pro Pipeline eine Bullet-Sub-Zeile:
- {Pipeline}: {gewonnen}/{gewonnen+verloren} ({Prozent})

## KI-Kommentar
2-3 Saetze: Wo lassen wir Geld liegen, welche Pipeline hat die schwaechste Conversion und warum.`;

export function buildConversionRatePrompt(ctx: CockpitContext): string {
  const won = ctx.deals.filter((d) => d.status === "won");
  const lost = ctx.deals.filter((d) => d.status === "lost");
  const lines: string[] = [];
  lines.push(`=== STAND: ${ctx.generatedAt.split("T")[0]} (Fenster: 90 Tage) ===`);
  lines.push(`Gewonnen: ${won.length} Deals (Summe ${formatEUR(sumValue(won))})`);
  lines.push(`Verloren: ${lost.length} Deals (Summe ${formatEUR(sumValue(lost))})`);
  lines.push("");

  for (const pipeline of ctx.pipelines) {
    const wonP = won.filter((d) => d.pipeline_id === pipeline.id);
    const lostP = lost.filter((d) => d.pipeline_id === pipeline.id);
    lines.push(
      `Pipeline ${pipeline.name}: ${wonP.length} gewonnen / ${lostP.length} verloren`,
    );
  }
  lines.push("");

  if (lost.length > 0) {
    lines.push("=== HAUPT-VERLUSTGRUENDE (max 5) ===");
    const reasons = new Map<string, number>();
    for (const d of lost) {
      const r = d.won_lost_reason ?? "ohne Grund";
      reasons.set(r, (reasons.get(r) ?? 0) + 1);
    }
    const sorted = Array.from(reasons.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    for (const [reason, count] of sorted) {
      lines.push(`- ${reason} (${count}x)`);
    }
  }

  return lines.join("\n");
}

// =============================================================
// 4. Forecast — Default Quartal, Sum(value × probability) pro Pipeline
// =============================================================

export const FORECAST_SYSTEM_PROMPT = `${SHARED_SYSTEM_PROMPT_PREAMBLE}

Erstelle einen Forecast in genau dieser Struktur:

## Forecast {Quartal-Label}
- Gewichtetes Pipeline-Volumen (Summe value*probability): {Summe} EUR
- Anzahl Deals im Quartal-Fenster: {n}

## Pro Pipeline
- {Pipeline}: {gewichteter Wert} EUR ({Anzahl Deals})

## KI-Kommentar
2-3 Saetze: Wie realistisch das Ziel ist, was den Forecast am staerksten beeinflusst.`;

export interface ForecastInput {
  ctx: CockpitContext;
  quarterStart: Date;
  quarterEnd: Date;
  quarterLabel: string;
}

export function buildForecastPrompt(input: ForecastInput): string {
  const { ctx, quarterStart, quarterEnd, quarterLabel } = input;
  const activeInQuarter = ctx.deals.filter((d) => {
    if (d.status !== "active") return false;
    if (!d.next_action_date && !d.updated_at) return false;
    const refIso = d.next_action_date ?? d.updated_at;
    const ref = new Date(refIso);
    return ref >= quarterStart && ref <= quarterEnd;
  });

  const weighted = activeInQuarter.reduce(
    (s, d) => s + (d.value ?? 0) * (d.probability / 100),
    0,
  );

  const lines: string[] = [];
  lines.push(`=== FORECAST-FENSTER: ${quarterLabel} (${quarterStart.toISOString().split("T")[0]} bis ${quarterEnd.toISOString().split("T")[0]}) ===`);
  lines.push(`Gewichtetes Volumen gesamt: ${formatEUR(weighted)}`);
  lines.push(`Aktive Deals im Fenster: ${activeInQuarter.length}`);
  lines.push("");

  for (const pipeline of ctx.pipelines) {
    const dealsP = activeInQuarter.filter((d) => d.pipeline_id === pipeline.id);
    const weightedP = dealsP.reduce((s, d) => s + (d.value ?? 0) * (d.probability / 100), 0);
    lines.push(`Pipeline ${pipeline.name}: ${formatEUR(weightedP)} (${dealsP.length} Deals)`);
  }

  return lines.join("\n");
}

export function currentQuarterRange(now: Date = new Date()): {
  start: Date;
  end: Date;
  label: string;
} {
  const month = now.getMonth();
  const quarter = Math.floor(month / 3);
  const year = now.getFullYear();
  const start = new Date(year, quarter * 3, 1);
  const end = new Date(year, quarter * 3 + 3, 0, 23, 59, 59);
  return { start, end, label: `Q${quarter + 1} ${year}` };
}

// =============================================================
// 5. Win/Loss-Aggregate — alle Won+Lost-Deals des Zeitraums (NICHT per Deal)
// =============================================================

export const WINLOSS_AGGREGATE_SYSTEM_PROMPT = `${SHARED_SYSTEM_PROMPT_PREAMBLE}

Erstelle eine Win/Loss-Analyse in genau dieser Struktur:

## Gewinn-Muster
2-4 Bullets: Welche Faktoren tauchen bei gewonnenen Deals haeufig auf (Branche, Pipeline, Stage-Geschwindigkeit, Multiplikatoren, etc.)

## Verlust-Muster
2-4 Bullets: Welche Faktoren tauchen bei verlorenen Deals haeufig auf, welche Verlustgruende dominieren.

## Empfehlung
2-3 Saetze: Konkreter Hebel zur Verbesserung der Win-Rate.`;

export function buildWinLossAggregatePrompt(ctx: CockpitContext): string {
  const won = ctx.deals.filter((d) => d.status === "won");
  const lost = ctx.deals.filter((d) => d.status === "lost");
  const lines: string[] = [];
  lines.push(`=== ZEITRAUM: letzte 90 Tage ===`);
  lines.push(`Gewonnen: ${won.length} (${formatEUR(sumValue(won))})`);
  lines.push(`Verloren: ${lost.length} (${formatEUR(sumValue(lost))})`);
  lines.push("");

  if (won.length > 0) {
    lines.push("=== GEWONNENE DEALS ===");
    for (const d of won.slice(0, 20)) {
      lines.push(
        `- ${d.title} (${d.company_name ?? "ohne Firma"}, ${formatEUR(d.value ?? 0)}, Pipeline ${d.pipeline_name ?? "?"}, Stage ${d.stage_name ?? "?"})`,
      );
    }
    lines.push("");
  }
  if (lost.length > 0) {
    lines.push("=== VERLORENE DEALS ===");
    for (const d of lost.slice(0, 20)) {
      const reason = d.won_lost_reason ? `, Grund: ${d.won_lost_reason}` : "";
      lines.push(
        `- ${d.title} (${d.company_name ?? "ohne Firma"}, ${formatEUR(d.value ?? 0)}, Pipeline ${d.pipeline_name ?? "?"}${reason})`,
      );
    }
  }
  return lines.join("\n");
}

// =============================================================
// 6. Stagnierende Deals — keine Activity in N Tagen
// =============================================================

export const STAGNIERENDE_DEALS_SYSTEM_PROMPT = `${SHARED_SYSTEM_PROMPT_PREAMBLE}

Erstelle eine Stagnations-Analyse in genau dieser Struktur:

## Stagnierende Deals ({Schwelle} Tage ohne Aktivitaet)
Bullet-Liste der stagnierenden Deals (max 15), pro Eintrag:
- {Deal-Titel} ({Firma}) · {Wert} EUR · stagniert seit {n} Tagen · Pipeline {Name}, Stage {Name}

## Empfehlung pro Deal-Cluster
2-4 Bullets: Wo waere ein Re-Engagement-Schritt sinnvoll, wo eher Aufgeben (parken/disqualifizieren).`;

export interface StagnierendeDealsInput {
  ctx: CockpitContext;
  thresholdDays: number;
  now: Date;
}

export function buildStagnierendeDealsPrompt(input: StagnierendeDealsInput): string {
  const { ctx, thresholdDays, now } = input;
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;

  const stagnant = ctx.deals
    .filter((d) => d.status === "active")
    .map((d) => {
      const ref = d.last_activity_at ?? d.updated_at;
      const idleMs = now.getTime() - new Date(ref).getTime();
      return { deal: d, idleDays: Math.floor(idleMs / (24 * 60 * 60 * 1000)), idleMs };
    })
    .filter((x) => x.idleMs >= thresholdMs)
    .sort((a, b) => b.idleDays - a.idleDays);

  const lines: string[] = [];
  lines.push(`=== STAND: ${now.toISOString().split("T")[0]} | Schwelle: ${thresholdDays} Tage ===`);
  lines.push(`Stagnierende Deals: ${stagnant.length}`);
  lines.push("");

  if (stagnant.length === 0) {
    lines.push("Keine stagnierenden Deals oberhalb der Schwelle.");
  } else {
    lines.push("=== DEALS ===");
    for (const x of stagnant.slice(0, 30)) {
      const d = x.deal;
      const value = d.value != null ? formatEUR(d.value) : "kein Wert";
      lines.push(
        `- ${d.title} (${d.company_name ?? "ohne Firma"}, ${value}, Pipeline ${d.pipeline_name ?? "?"}, Stage ${d.stage_name ?? "?"}) — ${x.idleDays} Tage idle`,
      );
    }
  }
  return lines.join("\n");
}

// =============================================================
// Helpers
// =============================================================

const EUR_FMT = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function formatEUR(value: number): string {
  return EUR_FMT.format(value);
}

function sumValue(deals: CockpitDeal[]): number {
  return deals.reduce((s, d) => s + (d.value ?? 0), 0);
}

function groupBy<T, K>(arr: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const item of arr) {
    const k = keyFn(item);
    const list = m.get(k) ?? [];
    list.push(item);
    m.set(k, list);
  }
  return m;
}
