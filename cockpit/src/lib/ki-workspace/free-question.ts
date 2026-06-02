// V8.7-A SLC-871 MT-4 — Free-Question Server-Action (DEC-248 +
// AC-871-1). User stellt freie Frage im Deal-Detail-Workspace, der
// Runner zieht parallel BS-RAG (deal-context) + IS-Knowledge-Search und
// laesst Bedrock eine umsetzbare Empfehlung mit beidem im Context
// formulieren. Kein Cache (cacheable=false in KIWorkspace.tsx).

"use server";

import { logIsKnowledgeQuery } from "@/lib/audit";
import {
  formatHitsForBedrockContext,
  toIsKnowledgeHits,
} from "@/lib/is-knowledge/format-hits";
import { redactPiiFromQ } from "@/lib/is-knowledge/redact-pii";
import {
  envelopeToErrorString,
  runIsSearchWithSoftCap,
  type IsSearchEnvelope,
} from "@/lib/is-knowledge/run-search-soft-cap";
import { IsKnowledgeError } from "@/lib/is-knowledge/types";
import { invokeReport } from "@/lib/ki-workspace/reports/_shared";
import { loadDealContext } from "@/lib/ki-workspace/deal-context";
import { formatDealContext } from "@/lib/ki-workspace/prompts/deal-context-format";
import { FREE_QUESTION_SYSTEM_PROMPT } from "@/lib/ki-workspace/prompts/free-question-prompt";
import type {
  ReportResult,
  RunReportArgs,
} from "@/components/ki-workspace/types";

interface BuildFreeQuestionPromptInput {
  question: string;
  dealContext: Parameters<typeof formatDealContext>[0];
  isHitsBlock: string;
}

function buildFreeQuestionUserPrompt(
  input: BuildFreeQuestionPromptInput
): string {
  const lines = [
    "## Frage",
    input.question,
    "",
    formatDealContext(input.dealContext, { maxActivities: 12, maxEmails: 5 }),
  ];
  if (input.isHitsBlock) {
    lines.push("", "---", "", input.isHitsBlock);
  }
  return lines.join("\n");
}

export async function runFreeQuestion(
  args: RunReportArgs
): Promise<ReportResult> {
  const question = (args.question ?? "").trim();
  if (!question) {
    throw new Error("Frage ist leer");
  }
  if (!args.scope.dealId) {
    // V8.7-A nur Deal-Detail-Workspace (DEC-249). Andere Workspaces
    // rufen runFreeQuestion gar nicht erst auf.
    throw new Error(
      "Free-Question benoetigt einen Deal-Kontext (V8.7-A nur Deal-Detail)"
    );
  }

  // Parallel-Fetch: BS-RAG (deal-context) + IS-Knowledge-Search.
  // Kein domain-Filter: IS V3.5 Foundation-Items liegen ueber alle Domains
  // (general/onboarding/marketing/...), nicht nur "sales". Engfuehrung auf
  // eine einzige Domain wuerde die Treffer-Quote im Workspace auf 0 senken
  // (B-2 Live-Smoke-Pre-Check 2026-06-02).
  const [contextSettled, isSettled] = await Promise.allSettled([
    loadDealContext(args.scope.dealId),
    runIsSearchWithSoftCap(question, {
      softCapReached: args.softCapReached,
      limit: 5,
    }),
  ]);

  if (contextSettled.status === "rejected") {
    throw contextSettled.reason;
  }
  const context = contextSettled.value;

  let isEnvelope: IsSearchEnvelope;
  if (isSettled.status === "rejected") {
    isEnvelope = {
      kind: "error",
      userMessage: "Strategaize-Wissens-Basis aktuell nicht erreichbar",
      isError: new IsKnowledgeError(
        "network",
        undefined,
        undefined,
        String(isSettled.reason)
      ),
    };
  } else {
    isEnvelope = isSettled.value;
  }

  const isHitsBlock =
    isEnvelope.kind === "ok" ? formatHitsForBedrockContext(isEnvelope.items) : "";

  const userPrompt = buildFreeQuestionUserPrompt({
    question,
    dealContext: context,
    isHitsBlock,
  });

  const baseResult = await invokeReport({
    reportId: args.reportId,
    scope: args.scope,
    systemPrompt: FREE_QUESTION_SYSTEM_PROMPT,
    userPrompt,
    llmOptions: { maxTokens: 768, temperature: 0.4 },
  });

  if (isEnvelope.kind === "ok" && args.workspaceSessionId) {
    // AC-871-4 + AC-871-8 + Live-Smoke Pfad 4: query_excerpt im audit_log
    // muss PII-redacted sein. Der Adapter redacted nur die Wire-Query, der
    // Audit-Pfad ist eine separate Datensenke — daher hier explizit redact.
    void logIsKnowledgeQuery({
      workspaceSessionId: args.workspaceSessionId,
      workspacePage: "deal-detail",
      queryExcerpt: redactPiiFromQ(question),
      costUsd: isEnvelope.queryEmbeddingCostUsd,
      itemCount: isEnvelope.items.length,
      similarityTop: isEnvelope.items[0]?.similarity ?? null,
      isResponseMs: isEnvelope.totalMs,
    });
  }

  return {
    ...baseResult,
    refreshable: false, // Free-Question hat keinen sinnvollen Refresh
    isKnowledgeHits:
      isEnvelope.kind === "ok"
        ? toIsKnowledgeHits(isEnvelope.items)
        : undefined,
    isKnowledgeError: envelopeToErrorString(isEnvelope),
    showIsFooter: true,
  };
}
