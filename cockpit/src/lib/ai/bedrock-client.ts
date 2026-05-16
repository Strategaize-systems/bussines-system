// =============================================================
// Bedrock Client — AWS Bedrock Runtime wrapper for Claude Sonnet
// =============================================================

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import type { LLMOptions, LLMResponse } from "./types";

// Default configuration
const DEFAULT_MODEL_ID = process.env.LLM_MODEL || "eu.anthropic.claude-sonnet-4-6-20250514-v1:0";
const REQUIRED_REGION = "eu-central-1";
const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * V7.5 SLC-752 MT-1 — Bedrock-Region-Pin (Data-Residency-Choke-Point).
 *
 * Wirft, wenn die effektive Region nicht `eu-central-1` ist oder weder
 * BEDROCK_REGION noch AWS_REGION gesetzt ist. Single Choke-Point fuer alle
 * Bedrock-Aufrufer (queryLLM, signals/extractor, winloss/runWinLossExtract,
 * ai/classifiers/*, knowledge/search, ki-workspace/reports, sculptor.ts).
 *
 * BEDROCK_REGION ist der kanonische Region-Pin laut data-residency.md.
 * AWS_REGION ist Backwards-Compat-Fallback fuer Coolify-ENV vor V7.5 — gilt
 * nach SLC-752 als Legacy. Beide auf eu-central-1 setzen ist zulaessig.
 */
export function assertBedrockRegion(): string {
  const fromBedrock = process.env.BEDROCK_REGION;
  const fromAws = process.env.AWS_REGION;
  const resolved = fromBedrock || fromAws;
  if (!resolved) {
    throw new Error(
      "Bedrock-Region-Drift: weder BEDROCK_REGION noch AWS_REGION gesetzt, erwartet eu-central-1. Data-Residency-Pflicht laut data-residency.md."
    );
  }
  if (resolved !== REQUIRED_REGION) {
    const source = fromBedrock ? "BEDROCK_REGION" : "AWS_REGION";
    throw new Error(
      `Bedrock-Region-Drift: ${source}=${resolved}, erwartet ${REQUIRED_REGION}. Data-Residency-Pflicht laut data-residency.md.`
    );
  }
  return resolved;
}

/**
 * Creates a Bedrock Runtime client configured from environment variables.
 * Region is pinned to eu-central-1 (Frankfurt) for GDPR compliance — siehe
 * `assertBedrockRegion()` Single-Choke-Point.
 */
function getClient(): BedrockRuntimeClient {
  const region = assertBedrockRegion();

  return new BedrockRuntimeClient({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    },
  });
}

/**
 * Sends a prompt to Claude Sonnet via AWS Bedrock and returns the raw text response.
 *
 * @param prompt - The user prompt to send
 * @param systemPrompt - Optional system prompt for behavior control
 * @param options - Temperature, maxTokens, timeout overrides
 * @returns LLMResponse with the raw text or error
 */
export async function queryLLM(
  prompt: string,
  systemPrompt?: string,
  options?: LLMOptions
): Promise<LLMResponse<string>> {
  const temperature = options?.temperature ?? DEFAULT_TEMPERATURE;
  const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // Validate environment
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return {
      success: false,
      data: null,
      error: "AWS credentials not configured (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)",
    };
  }

  const client = getClient();

  // Build the Anthropic Messages API payload for Bedrock
  const body: Record<string, unknown> = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: maxTokens,
    temperature,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  };

  if (systemPrompt) {
    body.system = systemPrompt;
  }

  const command = new InvokeModelCommand({
    modelId: DEFAULT_MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(body),
  });

  try {
    // Invoke with timeout using AbortController
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), timeoutMs);

    const response = await client.send(command, {
      abortSignal: abortController.signal,
    });

    clearTimeout(timeout);

    // Parse the response body
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Extract text from the Anthropic Messages API response format
    const text =
      responseBody.content?.[0]?.text ??
      responseBody.completion ??
      "";

    // V7.5 SLC-752: usage + modelId fuer Sculptor-Cost. Bedrock-Response-Shape:
    //   { content:[{text}], usage:{input_tokens, output_tokens}, ... }
    const usage =
      typeof responseBody.usage?.input_tokens === "number" &&
      typeof responseBody.usage?.output_tokens === "number"
        ? {
            input_tokens: responseBody.usage.input_tokens as number,
            output_tokens: responseBody.usage.output_tokens as number,
          }
        : undefined;

    return {
      success: true,
      data: text,
      error: null,
      raw: text,
      usage,
      modelId: DEFAULT_MODEL_ID,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown Bedrock error";

    // Detect timeout specifically
    if (message.includes("aborted") || message.includes("AbortError")) {
      return {
        success: false,
        data: null,
        error: `Bedrock request timed out after ${timeoutMs}ms`,
      };
    }

    return {
      success: false,
      data: null,
      error: `Bedrock invocation failed: ${message}`,
    };
  }
}
