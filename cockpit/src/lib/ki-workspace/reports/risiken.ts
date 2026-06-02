// SLC-871 MT-4 — Risiken-Einwaende-Report mit IS-Knowledge-Integration
// (DEC-248 risiken-einwaende-Report-Scope). Parallel-Fetch BS-RAG +
// IS-Search, Bedrock-Context wird optional um Strategaize-Foundation-
// Pattern erweitert.

"use server";

import { logIsKnowledgeQuery } from "@/lib/audit";
import {
  formatHitsForBedrockContext,
  toIsKnowledgeHits,
} from "@/lib/is-knowledge/format-hits";
import {
  envelopeToErrorString,
  runIsSearchWithSoftCap,
  type IsSearchEnvelope,
} from "@/lib/is-knowledge/run-search-soft-cap";
import { IsKnowledgeError } from "@/lib/is-knowledge/types";
import { loadDealContext } from "@/lib/ki-workspace/deal-context";
import {
  DEAL_RISIKEN_SYSTEM_PROMPT,
  buildDealRisikenPrompt,
} from "@/lib/ki-workspace/prompts/deal-risiken-prompt";
import type {
  ReportResult,
  RunReportArgs,
} from "@/components/ki-workspace/types";

import { invokeReport } from "./_shared";

// V8.7-A SLC-871 — fixed IS-query fuer risiken-einwaende-Report (DEC-248).
// Bewusst generisch, damit Strategaize-Pattern zu Einwand-Behandlungen
// und Risiko-Ankern semantisch matchen.
const IS_QUERY_RISIKEN = "Einwand-Behandlungen Risiken im Vertrieb";

export async function runReport(args: RunReportArgs): Promise<ReportResult> {
  if (!args.scope.dealId) {
    throw new Error("Risiko-Analyse benoetigt einen Deal-Kontext");
  }

  // Parallel-Fetch: BS-RAG (deal-context) + IS-Knowledge-Search.
  // allSettled, damit ein IS-Failure den BS-Pfad NICHT toetet (DEC-256).
  // Kein domain-Filter: IS V3.5 Foundation-Items liegen ueber alle Domains
  // (general/onboarding/marketing/...), nicht nur "sales". Engfuehrung auf
  // eine einzige Domain wuerde die Treffer-Quote im Workspace auf 0 senken
  // (B-2 Live-Smoke-Pre-Check 2026-06-02).
  const [contextSettled, isSettled] = await Promise.allSettled([
    loadDealContext(args.scope.dealId),
    runIsSearchWithSoftCap(IS_QUERY_RISIKEN, {
      softCapReached: args.softCapReached,
      limit: 5,
    }),
  ]);

  if (contextSettled.status === "rejected") {
    throw contextSettled.reason;
  }
  const context = contextSettled.value;

  // runIsSearchWithSoftCap wrapped Errors als Envelope, ein 'rejected'
  // Settle waere ein unerwarteter Bug. Wir degraden trotzdem gracefully.
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

  // Build Userprompt: base + optional IS-Hits Context-Block.
  const baseUserPrompt = buildDealRisikenPrompt({ context });
  const isHitsBlock =
    isEnvelope.kind === "ok" ? formatHitsForBedrockContext(isEnvelope.items) : "";
  const userPrompt = isHitsBlock
    ? `${baseUserPrompt}\n\n---\n\n${isHitsBlock}`
    : baseUserPrompt;

  const baseResult = await invokeReport({
    reportId: args.reportId,
    scope: args.scope,
    systemPrompt: DEAL_RISIKEN_SYSTEM_PROMPT,
    userPrompt,
    llmOptions: { maxTokens: 1024, temperature: 0.3 },
  });

  // audit_log nur bei erfolgreichem IS-Call (DEC-258). Fire-and-forget.
  if (isEnvelope.kind === "ok" && args.workspaceSessionId) {
    void logIsKnowledgeQuery({
      workspaceSessionId: args.workspaceSessionId,
      workspacePage: "deal-detail",
      queryExcerpt: IS_QUERY_RISIKEN,
      costUsd: isEnvelope.queryEmbeddingCostUsd,
      itemCount: isEnvelope.items.length,
      similarityTop: isEnvelope.items[0]?.similarity ?? null,
      isResponseMs: isEnvelope.totalMs,
    });
  }

  return {
    ...baseResult,
    isKnowledgeHits:
      isEnvelope.kind === "ok"
        ? toIsKnowledgeHits(isEnvelope.items)
        : undefined,
    isKnowledgeError: envelopeToErrorString(isEnvelope),
    showIsFooter: true,
  };
}
