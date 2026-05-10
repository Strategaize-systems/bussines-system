import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { queryLLM } from "@/lib/ai/bedrock-client";
import type { LLMOptions } from "@/lib/ai/types";
import type { KIWorkspaceScope, ReportResult } from "@/components/ki-workspace/types";

const REPORT_MODEL_ID =
  process.env.LLM_MODEL || "eu.anthropic.claude-sonnet-4-6-20250514-v1:0";

export type AuthorizedScope = { userId: string; dealId?: string };

/**
 * Resolves the current user via Supabase session and verifies the caller-supplied
 * scope.userId matches. Returns the canonical scope or throws.
 *
 * Why: Caller-supplied userId is untrusted (KIWorkspaceProps.scope). We always
 * cross-check against the authenticated session to prevent scope-injection.
 */
export async function authorizeReport(scope: KIWorkspaceScope): Promise<AuthorizedScope> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Nicht autorisiert");
  }
  if (scope.userId && scope.userId !== user.id) {
    throw new Error("Scope-User stimmt nicht mit Session-User ueberein");
  }
  return { userId: user.id, dealId: scope.dealId };
}

/**
 * Stable hash of scope payload — used for audit-log correlation per DEC-168
 * ("Audit-Log-Eintrag pro Bedrock-Call mit reportId+scope-Hash").
 */
export async function hashScope(scope: KIWorkspaceScope): Promise<string> {
  const canonical = JSON.stringify({ userId: scope.userId, dealId: scope.dealId ?? null });
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}

/**
 * Inserts a ki_workspace_report audit-log entry. Fire-and-forget — failures
 * never bubble to the caller because audit must not block a successful
 * Bedrock response (parity with logAudit).
 */
export async function logReportAudit(params: {
  reportId: string;
  scopeHash: string;
  userId: string;
  status: "succeeded" | "failed";
  errorMessage?: string;
}): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("audit_log").insert({
      actor_id: params.userId,
      action: "ki_workspace_report",
      entity_type: "ki_workspace",
      entity_id: params.userId,
      changes: null,
      context: JSON.stringify({
        reportId: params.reportId,
        scopeHash: params.scopeHash,
        status: params.status,
        ...(params.errorMessage ? { errorMessage: params.errorMessage } : {}),
      }),
    });
  } catch {
    // swallow — audit is best-effort
  }
}

export interface InvokeArgs {
  reportId: string;
  scope: KIWorkspaceScope;
  systemPrompt: string;
  userPrompt: string;
  llmOptions?: LLMOptions;
}

/**
 * Wraps the full Bedrock invocation lifecycle for a KI-Workspace report:
 * authorize → call queryLLM → audit-log → wrap as ReportResult.
 */
export async function invokeReport(args: InvokeArgs): Promise<ReportResult> {
  const authorized = await authorizeReport(args.scope);
  const scopeHash = await hashScope(args.scope);

  const llm = await queryLLM(args.userPrompt, args.systemPrompt, args.llmOptions);

  if (!llm.success || !llm.data) {
    void logReportAudit({
      reportId: args.reportId,
      scopeHash,
      userId: authorized.userId,
      status: "failed",
      errorMessage: llm.error ?? "unknown",
    });
    throw new Error(llm.error ?? "Bedrock-Call fehlgeschlagen");
  }

  void logReportAudit({
    reportId: args.reportId,
    scopeHash,
    userId: authorized.userId,
    status: "succeeded",
  });

  return {
    markdown: llm.data.trim(),
    completedAt: new Date().toISOString(),
    model: REPORT_MODEL_ID,
    refreshable: true,
  };
}
