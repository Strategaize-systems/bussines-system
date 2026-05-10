export type KIWorkspaceContext = "mein-tag" | "deal-detail" | "cockpit";

export interface KIWorkspaceScope {
  userId: string;
  dealId?: string;
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
}

export type ReportRunner = (args: RunReportArgs) => Promise<ReportResult>;
