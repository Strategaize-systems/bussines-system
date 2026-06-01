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

/**
 * V8.7-A SLC-871 MT-4 — additive optionale Felder fuer IS-Knowledge-Block
 * in AnswerPane (DEC-255). Existing Reports liefern diese Felder nicht;
 * KIWorkspace.tsx setzt zusaetzlich `showIsFooter` nur fuer Reports im
 * DEC-249-Scope (= Deal-Detail-Workspace + Free-Question/risiken-einwaende).
 */
export interface IsKnowledgeHit {
  id: string;
  title: string;
  similarity: number;
}

export interface ReportResult {
  markdown: string;
  completedAt: string;
  model: string;
  refreshable: boolean;
  // V8.7-A SLC-871 MT-4 (DEC-255/256)
  isKnowledgeHits?: IsKnowledgeHit[];
  isKnowledgeError?: string | null;
  showIsFooter?: boolean;
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
  // V8.7-A SLC-871 MT-4 — optional. Wird vom KIWorkspace gesetzt bei
  // Free-Question-Klick (User-Input ist die eigentliche Frage).
  question?: string;
  // V8.7-A SLC-871 MT-6 — wenn true, IS-Knowledge-Call wird vom Server-
  // Action uebersprungen (DEC-252 Soft-Cap-Schutz).
  softCapReached?: boolean;
  // V8.7-A SLC-871 MT-3 — workspace-session-uuid fuer audit_log.entity_id
  // (DEC-258). Wird vom KIWorkspace.tsx pro Mount generiert.
  workspaceSessionId?: string;
}

export type ReportRunner = (args: RunReportArgs) => Promise<ReportResult>;
