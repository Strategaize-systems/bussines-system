// SLC-705 MT-4 — KIWorkspaceContext um "team-cockpit" + KIWorkspaceScope um teamId erweitert.
export type KIWorkspaceContext = "mein-tag" | "deal-detail" | "cockpit" | "team-cockpit";

export interface KIWorkspaceScope {
  userId: string;
  dealId?: string;
  teamId?: string;
}

export interface KIWorkspaceReport {
  id: string;
  label: string;
  serverActionPath: string;
  cacheable: boolean;
}

export interface KIWorkspaceProps {
  context: KIWorkspaceContext;
  reports: KIWorkspaceReport[];
  scope: KIWorkspaceScope;
  voiceEnabled: boolean;
}

export interface ReportResult {
  markdown: string;
  completedAt: string;
  model: string;
  refreshable: boolean;
}

export interface RunReportArgs {
  reportId: string;
  scope: KIWorkspaceScope;
  /**
   * SLC-665 (DEC-171): manueller "Erneut analysieren"-Klick im AnswerPane
   * uebersteuert nicht nur den 5-Min-In-Memory-Cache (per useReportRun),
   * sondern auch DB-Caches wie den 24h-Win/Loss-Auto-Run-Cache.
   */
  bypassCache?: boolean;
}

export type ReportRunner = (args: RunReportArgs) => Promise<ReportResult>;
