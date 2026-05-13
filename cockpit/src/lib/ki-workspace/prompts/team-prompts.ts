// SLC-705 MT-4 — Pure-Function-Prompt-Builders fuer die 3 Team-Cockpit-Reports.
// Alle Funktionen sind testbar ohne DB/Bedrock.

import type { TeamBedrockContext } from "@/lib/team/aggregate-queries";

const SHARED_TEAM_PREAMBLE = `Du bist ein KI-Coaching-Cockpit fuer einen Teamlead im B2B-Vertrieb (deutscher Mittelstand).
Antworte auf Deutsch in kompaktem Markdown. Keine Einleitung, keine Floskeln.
Verwende ausschliesslich die Kennzahlen aus dem bereitgestellten Team-Snapshot.
Wenn die Datenbasis leer oder unklar ist, sage das ehrlich statt zu spekulieren.
Nenne Mitarbeiter immer mit Anzeigename, niemals nur per Rolle.`;

const EUR_FMT = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function formatEUR(value: number): string {
  return EUR_FMT.format(value);
}

interface MemberRow {
  user_id: string;
  display_name: string;
  role: string;
  pipeline_sum: number;
  open_deals: number;
  open_activities: number;
  overdue_count: number;
  last_login_at: string | null;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function formatMemberLine(m: MemberRow): string {
  const login = m.last_login_at ? m.last_login_at.split("T")[0] : "nie";
  return `- ${m.display_name} (${m.role}): Pipeline ${formatEUR(m.pipeline_sum)} · offene Deals ${m.open_deals} · offene Aktivitaeten ${m.open_activities} · ueberfaellig ${m.overdue_count} · letzter Login ${login}`;
}

// =============================================================
// 1. Team-Underperformance
// =============================================================

export const TEAM_UNDERPERFORMANCE_SYSTEM_PROMPT = `${SHARED_TEAM_PREAMBLE}

Identifiziere 1-3 Mitarbeiter, deren Pipeline-Summe deutlich unter dem Team-Durchschnitt liegt
UND/ODER deren Anzahl offener Aktivitaeten ungewoehnlich niedrig ist (Hinweis: wenig Bewegung).

Antworte in genau dieser Struktur:

## Underperformance-Verdacht
Bullet-Liste der auffaelligen Mitarbeiter (max 3), pro Eintrag:
- {Anzeigename}: {Indikator: niedrige Pipeline / wenig Aktivitaet / beides} — {1 Satz Beobachtung}

## Coaching-Vorschlag
Pro genanntem Mitarbeiter EINE Zeile mit einer konkreten 1-Satz-Coaching-Aktion (z.B. "1:1 zu Pipeline-Aufbau", "Kaltakquise-Tag einplanen").

Wenn keine Auffaelligkeiten erkennbar sind, sage das mit einem Satz unter "## Underperformance-Verdacht" und lasse die Coaching-Sektion weg.`;

export function buildTeamUnderperformancePrompt(args: { ctx: TeamBedrockContext }): string {
  const { ctx } = args;
  const members = ctx.members;
  const lines: string[] = [];
  lines.push(`=== STAND: ${ctx.generatedAt.split("T")[0]} ===`);
  lines.push(`Team-Groesse: ${members.length} Mitarbeiter`);

  if (members.length === 0) {
    lines.push("");
    lines.push("Keine Mitarbeiter im Team-Scope sichtbar.");
    return lines.join("\n");
  }

  const avgPipeline = average(members.map((m) => m.pipeline_sum));
  const avgOpenActivities = average(members.map((m) => m.open_activities));
  lines.push(`Team-Durchschnitt Pipeline: ${formatEUR(avgPipeline)}`);
  lines.push(`Team-Durchschnitt offene Aktivitaeten: ${avgOpenActivities.toFixed(1)}`);
  lines.push("");
  lines.push("=== MITARBEITER ===");
  for (const m of members) {
    lines.push(formatMemberLine(m));
  }
  lines.push("");
  lines.push("Erstelle die Underperformance-Analyse strikt im definierten Format.");
  return lines.join("\n");
}

// =============================================================
// 2. Team-Burnout-Risiko
// =============================================================

export const TEAM_BURNOUT_SYSTEM_PROMPT = `${SHARED_TEAM_PREAMBLE}

Identifiziere Mitarbeiter mit Burnout-/Ueberlastungs-Risiko: ungewoehnlich HOHE Anzahl offener
Aktivitaeten UND/ODER ungewoehnlich HOHE Anzahl ueberfaelliger Aktivitaeten im Vergleich zum
Team-Durchschnitt. Das deutet auf Ueberlast hin (zu viele Baustellen, nichts wird mehr abgeschlossen).

Antworte in genau dieser Struktur:

## Ueberlastungs-Verdacht
Bullet-Liste der gefaehrdeten Mitarbeiter (max 3), pro Eintrag:
- {Anzeigename}: offene Aktivitaeten {n} · ueberfaellig {n} — {1 Satz Beobachtung}

## Last-Balance-Vorschlag
Pro genanntem Mitarbeiter EINE Zeile mit einer konkreten 1-Satz-Massnahme (z.B. "Aktivitaeten priorisieren und 5 schliessen", "Deals umverteilen").

Wenn keine Ueberlast erkennbar ist, sage das mit einem Satz unter "## Ueberlastungs-Verdacht" und lasse die Vorschlags-Sektion weg.`;

export function buildTeamBurnoutPrompt(args: { ctx: TeamBedrockContext }): string {
  const { ctx } = args;
  const members = ctx.members;
  const lines: string[] = [];
  lines.push(`=== STAND: ${ctx.generatedAt.split("T")[0]} ===`);
  lines.push(`Team-Groesse: ${members.length} Mitarbeiter`);

  if (members.length === 0) {
    lines.push("");
    lines.push("Keine Mitarbeiter im Team-Scope sichtbar.");
    return lines.join("\n");
  }

  const avgOpenActivities = average(members.map((m) => m.open_activities));
  const avgOverdue = average(members.map((m) => m.overdue_count));
  lines.push(`Team-Durchschnitt offene Aktivitaeten: ${avgOpenActivities.toFixed(1)}`);
  lines.push(`Team-Durchschnitt ueberfaellig: ${avgOverdue.toFixed(1)}`);
  lines.push("");
  lines.push("=== MITARBEITER ===");
  for (const m of members) {
    lines.push(formatMemberLine(m));
  }
  lines.push("");
  lines.push("Erstelle die Ueberlastungs-Analyse strikt im definierten Format.");
  return lines.join("\n");
}

// =============================================================
// 3. Team-Stale-Deals (heuristisch — Snapshot kennt keine per-Deal-Details)
// =============================================================

export const TEAM_STALE_DEALS_SYSTEM_PROMPT = `${SHARED_TEAM_PREAMBLE}

WICHTIGE EINSCHRAENKUNG: Der Team-Snapshot enthaelt nur pro-Mitarbeiter-Roll-Ups,
KEINE einzelnen Deal-Datensaetze. Du kannst daher Stagnation nicht deal-genau benennen,
sondern nur per Mitarbeiter heuristisch hervorheben: viele offene Deals UND gleichzeitig
wenig offene Aktivitaeten = Verdacht auf stillstehende Pipeline (Deals liegen, nichts wird angestossen).

Antworte in genau dieser Struktur:

## Stagnations-Verdacht (heuristisch)
Bullet-Liste der auffaelligen Mitarbeiter (max 3), pro Eintrag:
- {Anzeigename}: offene Deals {n}, offene Aktivitaeten {n} — {1 Satz Beobachtung}

## Empfehlung
Pro genanntem Mitarbeiter EINE Zeile mit einer konkreten 1-Satz-Aktion (z.B. "Deal-Review im 1:1", "Top-3-Deals identifizieren und naechste Aktion setzen").

Wenn das Verhaeltnis Deals/Aktivitaeten ueberall gesund aussieht, sage das mit einem Satz unter "## Stagnations-Verdacht (heuristisch)" und lasse die Empfehlungs-Sektion weg.

Beziehe dich AUSSCHLIESSLICH auf die Roll-Up-Zahlen. Erfinde keine Deal-Titel.`;

export function buildTeamStaleDealsPrompt(args: { ctx: TeamBedrockContext }): string {
  const { ctx } = args;
  const members = ctx.members;
  const lines: string[] = [];
  lines.push(`=== STAND: ${ctx.generatedAt.split("T")[0]} ===`);
  lines.push(`Team-Groesse: ${members.length} Mitarbeiter`);

  if (members.length === 0) {
    lines.push("");
    lines.push("Keine Mitarbeiter im Team-Scope sichtbar.");
    return lines.join("\n");
  }

  lines.push("");
  lines.push("=== MITARBEITER (Roll-Up) ===");
  for (const m of members) {
    const ratio = m.open_activities > 0 ? (m.open_deals / m.open_activities).toFixed(2) : "n/a";
    lines.push(`${formatMemberLine(m)} — Deals/Aktivitaeten-Ratio: ${ratio}`);
  }
  lines.push("");
  lines.push(
    "Erstelle die heuristische Stagnations-Analyse strikt im definierten Format. Verwende NUR die obigen Roll-Up-Zahlen.",
  );
  return lines.join("\n");
}
