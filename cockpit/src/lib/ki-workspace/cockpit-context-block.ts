// V7.6 SLC-762 MT-3 — Cockpit-Datenkontext-Loader fuer Custom-Reports.
//
// Reuse: bestehendes loadCockpitContext() aus lib/ki-workspace/cockpit-context.ts
// (SLC-666). Hier nur der Text-Formatter, der die strukturierten Deals/Pipelines
// als Plain-Text-Block fuer den Bedrock-Prompt aufbereitet.

import { loadCockpitContext } from "@/lib/ki-workspace/cockpit-context";

const ACTIVE_TOP_N = 25;
const RECENT_TOP_N = 8;

export async function loadCockpitContextBlock(): Promise<string> {
  const ctx = await loadCockpitContext();
  const lines: string[] = [];

  const active = ctx.deals
    .filter((d) => d.status === "active")
    .sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1));
  const won = ctx.deals
    .filter((d) => d.status === "won")
    .sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1));
  const lost = ctx.deals
    .filter((d) => d.status === "lost")
    .sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1));

  lines.push(`Snapshot: ${ctx.generatedAt}`);
  lines.push(
    `Aktive Deals: ${active.length}, Won (90d): ${won.length}, Lost (90d): ${lost.length}`
  );

  lines.push("");
  lines.push("Pipelines:");
  if (ctx.pipelines.length === 0) {
    lines.push("- keine Pipelines konfiguriert");
  } else {
    for (const p of ctx.pipelines) {
      lines.push(`- ${p.name}`);
    }
  }

  lines.push("");
  lines.push(`Aktive Deals (Top ${ACTIVE_TOP_N} nach Updated):`);
  if (active.length === 0) {
    lines.push("- keine aktiven Deals");
  } else {
    for (const d of active.slice(0, ACTIVE_TOP_N)) {
      const value =
        d.value != null ? `${d.value.toLocaleString("de-DE")} EUR` : "kein Wert";
      const stage = d.stage_name ?? "ohne Phase";
      const pipeline = d.pipeline_name ?? "ohne Pipeline";
      const company = d.company_name ? ` - ${d.company_name}` : "";
      const lastAct = d.last_activity_at
        ? ` | letzte Aktivitaet: ${d.last_activity_at.slice(0, 10)}`
        : "";
      lines.push(
        `- ${d.title}${company} (${value}, ${pipeline} / ${stage}, ${d.probability}%)${lastAct}`
      );
    }
  }

  lines.push("");
  lines.push(`Gewonnen (letzte 90d, Top ${RECENT_TOP_N}):`);
  if (won.length === 0) {
    lines.push("- keine Won-Deals");
  } else {
    for (const d of won.slice(0, RECENT_TOP_N)) {
      const value =
        d.value != null ? `${d.value.toLocaleString("de-DE")} EUR` : "kein Wert";
      const reason = d.won_lost_reason ? ` | Grund: ${d.won_lost_reason}` : "";
      lines.push(
        `- ${d.title} (${value}, ${d.updated_at.slice(0, 10)})${reason}`
      );
    }
  }

  lines.push("");
  lines.push(`Verloren (letzte 90d, Top ${RECENT_TOP_N}):`);
  if (lost.length === 0) {
    lines.push("- keine Lost-Deals");
  } else {
    for (const d of lost.slice(0, RECENT_TOP_N)) {
      const value =
        d.value != null ? `${d.value.toLocaleString("de-DE")} EUR` : "kein Wert";
      const reason = d.won_lost_reason ? ` | Grund: ${d.won_lost_reason}` : "";
      lines.push(
        `- ${d.title} (${value}, ${d.updated_at.slice(0, 10)})${reason}`
      );
    }
  }

  return lines.join("\n");
}
