// SLC-705 MT-4 — authorizeTeamReport hinzugefuegt (admin/teamlead-Rollen-Gate).
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { queryLLM } from "@/lib/ai/bedrock-client";
import { getProfile } from "@/lib/auth/get-profile";
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
 * SLC-705 MT-4 — Authorize a Team-scope report.
 *
 * Unterschied zu authorizeReport: caller MUSS admin oder teamlead sein.
 * scope.userId ist hier caller-supplied und wird nicht 1:1 mit auth.uid
 * abgeglichen — der scope referenziert den aufrufenden Teamlead/Admin
 * selbst (als Owner-Surrogat), nicht ein anderes Subjekt. Zusaetzlich
 * pruefen wir defensiv: wenn teamlead UND scope.teamId vorhanden, muss
 * sie zur caller.team_id passen (RLS filtert ohnehin schon).
 */
export async function authorizeTeamReport(scope: KIWorkspaceScope): Promise<AuthorizedScope> {
  const profile = await getProfile();
  if (profile.role !== "admin" && profile.role !== "teamlead") {
    throw new Error("Nicht autorisiert: Team-Reports nur fuer admin oder teamlead");
  }
  if (
    profile.role === "teamlead" &&
    scope.teamId &&
    profile.team_id &&
    scope.teamId !== profile.team_id
  ) {
    throw new Error("Scope-Team stimmt nicht mit caller.team_id ueberein");
  }
  return { userId: profile.user_id, dealId: scope.dealId };
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
    // V8.11 SLC-904 (MIG-048): audit_log INSERT erfordert service_role.
    const admin = createAdminClient();
    await admin.from("audit_log").insert({
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
  return runBedrockAndAudit(authorized, args);
}

/**
 * SLC-705 MT-4 — Variante mit Team-Rollen-Gate (admin/teamlead).
 * Gleicher Lifecycle wie invokeReport, nur andere authorize-Funktion.
 */
export async function invokeTeamReport(args: InvokeArgs): Promise<ReportResult> {
  const authorized = await authorizeTeamReport(args.scope);
  return runBedrockAndAudit(authorized, args);
}

async function runBedrockAndAudit(
  authorized: AuthorizedScope,
  args: InvokeArgs,
): Promise<ReportResult> {
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
