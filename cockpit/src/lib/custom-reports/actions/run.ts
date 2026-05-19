"use server";

// V7.6 SLC-762 MT-3 — runCustomReport Server-Action.
//
// 4-Schritt-Flow (AC7):
//   1. SELECT custom_reports WHERE id=$1 (RLS-implicit Owner-Filter).
//   2. runCustomReportCore({ promptTemplate, contextType }) — Loader + Bedrock.
//   3. UPDATE usage_count = usage_count + 1, last_used_at = now().
//   4. audit_log INSERT 'custom_report.executed' (Cost-Metadaten).
//
// Reuse-Trail:
//   - lib/ki-workspace/custom-report-runner.ts (V7.6 SLC-762).
//   - apply-nl-rule.ts audit-Pattern (V7.5 SLC-754).
//   - feedback_use_server_value_export_forbidden: nur async functions exportiert.

import { getProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";
import { RunCustomReportSchema } from "@/lib/custom-reports/schema";
import { runCustomReportCore } from "@/lib/ki-workspace/custom-report-runner";
import type {
  CustomReportContextType,
  RunCustomReportInput,
  RunCustomReportResult,
} from "@/lib/custom-reports/types";

interface CustomReportLoadRow {
  id: string;
  name: string;
  prompt_template: string;
  context_type: CustomReportContextType;
}

export async function runCustomReport(
  input: RunCustomReportInput
): Promise<RunCustomReportResult> {
  const profile = await getProfile();

  const parsed = RunCustomReportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "infra",
      message: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  if (parsed.data.scope.userId !== profile.user_id) {
    return {
      ok: false,
      code: "unauthenticated",
      message: "Scope-User stimmt nicht mit Session-User ueberein.",
    };
  }

  const supabase = await createClient();

  // 1. SELECT (RLS-implicit Owner-Filter).
  const { data: row, error: selErr } = await supabase
    .from("custom_reports")
    .select("id, name, prompt_template, context_type")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (selErr) {
    return {
      ok: false,
      code: "infra",
      message: `Custom-Report Select fehlgeschlagen: ${selErr.message}`,
    };
  }
  if (!row) {
    return {
      ok: false,
      code: "not_found",
      message: "Custom-Report nicht gefunden oder kein Zugriff.",
    };
  }
  const report = row as CustomReportLoadRow;

  // 2. Bedrock-Call.
  let runOutput: Awaited<ReturnType<typeof runCustomReportCore>>;
  try {
    runOutput = await runCustomReportCore({
      promptTemplate: report.prompt_template,
      contextType: report.context_type,
    });
  } catch (e) {
    return {
      ok: false,
      code: "bedrock",
      message: `Bedrock-Call fehlgeschlagen: ${(e as Error).message}`,
    };
  }

  // 3. usage_count + last_used_at updaten (best-effort fuer Ergebnis, aber Fehler loggen).
  try {
    const { error: updErr } = await supabase
      .from("custom_reports")
      .update({
        usage_count: await readUsageCountForIncrement(supabase, report.id),
        last_used_at: new Date().toISOString(),
      })
      .eq("id", report.id);
    if (updErr) {
      console.warn(
        `[custom-report] usage_count UPDATE failed for ${report.id}: ${updErr.message}`
      );
    }
  } catch (e) {
    console.warn(
      `[custom-report] usage_count UPDATE threw for ${report.id}: ${(e as Error).message}`
    );
  }

  // 4. audit_log (best-effort).
  try {
    await supabase.from("audit_log").insert({
      actor_id: profile.user_id,
      action: "custom_report.executed",
      entity_type: "custom_report",
      entity_id: report.id,
      changes: null,
      context: JSON.stringify({
        name: report.name,
        context_type: report.context_type,
        model_id: runOutput.modelId,
        cost_usd: runOutput.costUsd,
        input_tokens: runOutput.inputTokens,
        output_tokens: runOutput.outputTokens,
      }),
    });
  } catch {
    // intentional best-effort
  }

  return { ok: true, result: runOutput.reportResult };
}

/**
 * Liest aktuellen usage_count und gibt +1 zurueck. Vereinfachte Variante
 * (race-condition akzeptabel fuer Sort-Heuristik). Eine atomare RPC-Variante
 * waere besser, aber V7.6 hat keinen RPC-Slot — Defer V7.7+.
 */
async function readUsageCountForIncrement(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string
): Promise<number> {
  const { data } = await supabase
    .from("custom_reports")
    .select("usage_count")
    .eq("id", id)
    .maybeSingle();
  const current = (data as { usage_count?: number } | null)?.usage_count ?? 0;
  return current + 1;
}
