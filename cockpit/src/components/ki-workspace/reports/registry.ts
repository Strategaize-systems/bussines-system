// SLC-705 MT-4 — TEAM_COCKPIT_REPORTS hinzugefuegt (3 Team-scope Bedrock-Reports).
import type { KIWorkspaceReport } from "../types";

export const MEIN_TAG_REPORTS: KIWorkspaceReport[] = [
  { id: "tagesanalyse", label: "Tagesanalyse", serverActionPath: "@/lib/ki-workspace/reports/tagesanalyse", cacheable: true },
  { id: "gestern", label: "Gestern", serverActionPath: "@/lib/ki-workspace/reports/gestern", cacheable: true },
  { id: "seit-login", label: "Seit Login", serverActionPath: "@/lib/ki-workspace/reports/seit-login", cacheable: false },
  { id: "wochen-performance", label: "Wochen-Performance", serverActionPath: "@/lib/ki-workspace/reports/wochen-performance", cacheable: true },
  { id: "pipeline-risiko", label: "Pipeline-Risiko", serverActionPath: "@/lib/ki-workspace/reports/pipeline-risiko", cacheable: true },
];

export const DEAL_DETAIL_REPORTS: KIWorkspaceReport[] = [
  { id: "briefing", label: "Briefing", serverActionPath: "@/lib/ki-workspace/reports/briefing", cacheable: true },
  { id: "signale-extrahieren", label: "Signale extrahieren", serverActionPath: "@/lib/ki-workspace/reports/signale", cacheable: true },
  { id: "risiken-einwaende", label: "Risiken & Einwaende", serverActionPath: "@/lib/ki-workspace/reports/risiken", cacheable: true },
  { id: "naechster-schritt", label: "Naechster sinnvoller Schritt", serverActionPath: "@/lib/ki-workspace/reports/naechster-schritt", cacheable: true },
  { id: "winloss-analyse", label: "Win/Loss-Analyse", serverActionPath: "@/lib/ki-workspace/reports/winloss", cacheable: true },
];

export const COCKPIT_REPORTS: KIWorkspaceReport[] = [
  { id: "pipeline-snapshot", label: "Pipeline-Snapshot", serverActionPath: "@/lib/ki-workspace/reports/pipeline-snapshot", cacheable: true },
  { id: "top-chancen", label: "Top-Chancen", serverActionPath: "@/lib/ki-workspace/reports/top-chancen", cacheable: true },
  { id: "conversion-rate", label: "Conversion-Rate", serverActionPath: "@/lib/ki-workspace/reports/conversion-rate", cacheable: true },
  { id: "forecast", label: "Forecast", serverActionPath: "@/lib/ki-workspace/reports/forecast", cacheable: true },
  { id: "winloss-analyse", label: "Win/Loss-Analyse", serverActionPath: "@/lib/ki-workspace/reports/winloss-aggregate", cacheable: true },
  { id: "stagnierende-deals", label: "Stagnierende Deals", serverActionPath: "@/lib/ki-workspace/reports/stagnierende-deals", cacheable: true },
];

// SLC-705 MT-4 — Team-Cockpit-Berichte (admin + teamlead only).
export const TEAM_COCKPIT_REPORTS: KIWorkspaceReport[] = [
  { id: "team-underperformance", label: "Underperformance", serverActionPath: "@/lib/ki-workspace/reports/team-underperformance", cacheable: true },
  { id: "team-burnout", label: "Burnout-Risiko", serverActionPath: "@/lib/ki-workspace/reports/team-burnout", cacheable: true },
  { id: "team-stale-deals", label: "Stagnations-Verdacht", serverActionPath: "@/lib/ki-workspace/reports/team-stale-deals", cacheable: true },
];
