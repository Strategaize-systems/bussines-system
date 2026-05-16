"use server";

// SLC-665 MT-8 (DEC-171) — Manueller Win/Loss-Berichts-Pfad.
//
// Ablauf:
//   1. Wenn ein Auto-Run der letzten 24h vorhanden ist UND der User kein
//      Bypass-Flag setzt: liefere den gecachten Output zurueck.
//   2. Sonst: triggere `runWinLossExtract` (gleiche Bedrock-Logik wie der
//      Auto-Trigger), schreibe einen neuen `auto_winloss_runs`-Eintrag mit
//      `triggered_by_user_id` (manueller Re-Run).
//   3. "Aktualisieren"-Button im AnswerPane setzt bypassCache=true.

import { invokeReport, authorizeReport } from "./_shared";
import { classifyDealStatus, persistManualRun } from "./winloss-persist";
import { loadDealContext } from "@/lib/ki-workspace/deal-context";
import {
  DEAL_WINLOSS_SYSTEM_PROMPT,
  buildDealWinLossPrompt,
} from "@/lib/ki-workspace/prompts/deal-winloss-prompt";
import { runWinLossExtract } from "@/lib/winloss/runWinLossExtract";
import { WINLOSS_CACHE_TTL_MS } from "@/lib/winloss/cache-ttl";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  RunReportArgs,
  ReportResult,
} from "@/components/ki-workspace/types";

const CACHE_TTL_MS = WINLOSS_CACHE_TTL_MS;
const MODEL_ID =
  process.env.LLM_MODEL || "eu.anthropic.claude-sonnet-4-6-20250514-v1:0";

export async function runReport(args: RunReportArgs): Promise<ReportResult> {
  if (!args.scope.dealId) {
    throw new Error("Win/Loss-Analyse benoetigt einen Deal-Kontext");
  }

  const authorized = await authorizeReport(args.scope);

  // 1. 24h-Auto-Run-Cache pruefen (wenn nicht bypassed)
  if (!args.bypassCache) {
    const cached = await loadRecentAutoRun(args.scope.dealId);
    if (cached) {
      return {
        markdown: cached.markdown,
        completedAt: cached.completedAt,
        model: cached.model,
        refreshable: true,
      };
    }
  }

  // 2. Manueller Re-Run: gleiche Bedrock-Logik wie der Auto-Trigger,
  //    aber Trigger-By-User. Beim Erfolg in auto_winloss_runs ablegen.
  const dealId = args.scope.dealId;
  try {
    const result = await runWinLossExtract({
      dealId,
      targetStatus: await classifyDealStatus(dealId),
    });

    await persistManualRun({
      dealId,
      userId: authorized.userId,
      markdown: result.markdown,
      model: result.model,
      completedAt: result.completedAt,
    });

    return {
      markdown: result.markdown,
      completedAt: result.completedAt,
      model: result.model,
      refreshable: true,
    };
  } catch {
    // Fallback: verwende den bestehenden invokeReport-Pfad, der Audit-Log
    // schreibt. Dadurch bleibt der Berichts-Knopf auch fuer aktive Deals
    // (ohne won/lost) klickbar.
    const context = await loadDealContext(dealId);
    const userPrompt = buildDealWinLossPrompt({ context });
    return invokeReport({
      reportId: args.reportId,
      scope: args.scope,
      systemPrompt: DEAL_WINLOSS_SYSTEM_PROMPT,
      userPrompt,
      llmOptions: { maxTokens: 1280, temperature: 0.3 },
    });
  }
}

async function loadRecentAutoRun(
  dealId: string
): Promise<
  | { markdown: string; model: string; completedAt: string }
  | null
> {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();
  const { data } = await supabase
    .from("auto_winloss_runs")
    .select(
      "bedrock_output, bedrock_model, bedrock_completed_at, triggered_at, status"
    )
    .eq("deal_id", dealId)
    .eq("status", "succeeded")
    .gte("triggered_at", cutoff)
    .order("triggered_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const row = data as {
    bedrock_output: string | null;
    bedrock_model: string | null;
    bedrock_completed_at: string | null;
    triggered_at: string;
  };
  if (!row.bedrock_output) return null;

  return {
    markdown: row.bedrock_output,
    model: row.bedrock_model ?? MODEL_ID,
    completedAt:
      row.bedrock_completed_at ?? row.triggered_at ?? new Date().toISOString(),
  };
}

