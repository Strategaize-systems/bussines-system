// V7.6 SLC-762 MT-3 — Custom-Report-Runner: Loader-Switch + Bedrock-Call.
//
// `runCustomReportCore` ist die zentrale Pure-Function des Custom-Reports-
// Pfads (DEC-215 Context-Type-Default-Loader). Sie:
//   1. Waehlt anhand contextType den passenden Datenkontext-Loader.
//   2. Baut den User-Prompt = SYSTEM + dataContext + prompt_template.
//   3. Ruft queryLLM (Region-Pin per assertBedrockRegion).
//   4. Returnt ReportResult plus Cost-Metadaten (fuer audit_log).
//
// Reuse-Trail:
//   - lib/ai/bedrock-client.ts queryLLM + assertBedrockRegion (V7.5 DEC-211).
//   - lib/automation/sculptor-cost.ts calculateSculptCost + PRICING (V7.5).
//     R7-Mitigation: Cross-Module-Import statt Extract nach lib/ai/. Wenn die
//     Pricing-Tabelle in V7.7+ von weiteren Modulen gebraucht wird, dann nach
//     lib/ai/bedrock-pricing.ts extracten (Backlog-Note).
//   - lib/ki-workspace/mein-tag-context.ts (V7.6 SLC-762).
//   - lib/ki-workspace/cockpit-context-block.ts (V7.6 SLC-762).

import { queryLLM } from "@/lib/ai/bedrock-client";
import { calculateSculptCost } from "@/lib/automation/sculptor-cost";
import {
  CUSTOM_REPORT_SYSTEM_PROMPT,
  buildCustomReportUserPrompt,
} from "@/lib/ki-workspace/custom-report-prompt";
import { loadMeinTagContextBlock } from "@/lib/ki-workspace/mein-tag-context";
import { loadCockpitContextBlock } from "@/lib/ki-workspace/cockpit-context-block";
import type { ReportResult } from "@/components/ki-workspace/types";
import type { CustomReportContextType } from "@/lib/custom-reports/types";

export interface RunCustomReportCoreInput {
  promptTemplate: string;
  contextType: CustomReportContextType;
}

export interface RunCustomReportCoreOutput {
  reportResult: ReportResult;
  modelId: string | null;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
}

async function loadContextBlock(
  contextType: CustomReportContextType
): Promise<string> {
  switch (contextType) {
    case "mein-tag":
      return loadMeinTagContextBlock();
    case "cockpit":
      return loadCockpitContextBlock();
    default: {
      const exhaustive: never = contextType;
      throw new Error(`Unbekannter context_type: ${String(exhaustive)}`);
    }
  }
}

export async function runCustomReportCore(
  input: RunCustomReportCoreInput
): Promise<RunCustomReportCoreOutput> {
  const contextBlock = await loadContextBlock(input.contextType);

  const userPrompt = buildCustomReportUserPrompt({
    contextBlock,
    promptTemplate: input.promptTemplate,
  });

  const llm = await queryLLM(userPrompt, CUSTOM_REPORT_SYSTEM_PROMPT, {
    maxTokens: 1024,
    temperature: 0.3,
  });

  if (!llm.success || llm.data == null) {
    throw new Error(llm.error ?? "Bedrock-Call fehlgeschlagen");
  }

  const modelId = llm.modelId ?? null;
  const usage = llm.usage ?? { input_tokens: 0, output_tokens: 0 };
  let costUsd = 0;
  if (modelId) {
    try {
      costUsd = calculateSculptCost(usage, modelId);
    } catch {
      costUsd = 0;
    }
  }

  return {
    reportResult: {
      markdown: llm.data.trim(),
      completedAt: new Date().toISOString(),
      model: modelId ?? "unknown",
      refreshable: true,
    },
    modelId,
    costUsd,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
  };
}
