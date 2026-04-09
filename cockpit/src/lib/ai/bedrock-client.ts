// =============================================================
// Bedrock Client — AWS Bedrock Runtime wrapper for Claude Sonnet
// =============================================================

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import type { LLMOptions, LLMResponse } from "./types";

// Default configuration
const DEFAULT_MODEL_ID = "anthropic.claude-sonnet-4-6-20250514-v1:0";
const DEFAULT_REGION = "eu-central-1";
const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Creates a Bedrock Runtime client configured from environment variables.
 * Region defaults to eu-central-1 (Frankfurt) for GDPR compliance.
 */
function getClient(): BedrockRuntimeClient {
  const region = process.env.AWS_REGION || DEFAULT_REGION;

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

    return {
      success: true,
      data: text,
      error: null,
      raw: text,
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
