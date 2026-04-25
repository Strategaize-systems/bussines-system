// =============================================================
// AzureWhisperProvider — Unit Tests (mocked AzureOpenAI client)
// SLC-522 / FEAT-522 — V5.2 Compliance-Sprint
// =============================================================

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AzureWhisperProvider } from "./azure";

const TEST_BUFFER = Buffer.from("fake-audio-bytes");
const TEST_FILENAME = "test.wav";

const ENV_KEYS = [
  "AZURE_OPENAI_ENDPOINT",
  "AZURE_OPENAI_API_KEY",
  "AZURE_OPENAI_WHISPER_DEPLOYMENT_ID",
  "AZURE_OPENAI_API_VERSION",
] as const;

function setValidEnv(): void {
  process.env.AZURE_OPENAI_ENDPOINT = "https://test-resource.westeurope.openai.azure.com";
  process.env.AZURE_OPENAI_API_KEY = "test-key-abc";
  process.env.AZURE_OPENAI_WHISPER_DEPLOYMENT_ID = "whisper-deployment";
  process.env.AZURE_OPENAI_API_VERSION = "2024-06-01";
}

function clearEnv(): void {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

function makeMockClient(behavior: "success" | "error" | "timeout"): {
  audio: {
    transcriptions: {
      create: (...args: unknown[]) => Promise<unknown>;
    };
  };
} {
  return {
    audio: {
      transcriptions: {
        create: async () => {
          if (behavior === "success") {
            return {
              text: "Das ist ein Test-Transkript.",
              language: "de",
              duration: 12.5,
            };
          }
          if (behavior === "error") {
            throw new Error("Azure API returned 500");
          }
          // timeout
          throw new Error("Request timeout after 120000ms");
        },
      },
    },
  };
}

describe("AzureWhisperProvider", () => {
  beforeEach(() => {
    // Silence audit-log noise in test output
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    clearEnv();
    vi.restoreAllMocks();
  });

  it("returns success result with text when client succeeds", async () => {
    setValidEnv();
    const provider = new AzureWhisperProvider(
      () => makeMockClient("success") as never,
    );

    const result = await provider.transcribe(TEST_BUFFER, TEST_FILENAME);

    expect(result.success).toBe(true);
    expect(result.text).toBe("Das ist ein Test-Transkript.");
    expect(result.language).toBe("de");
    expect(result.duration).toBe(12.5);
    expect(result.provider).toBe("azure");
    expect(result.error).toBeNull();
  });

  it("returns structured error when client throws non-timeout error", async () => {
    setValidEnv();
    const provider = new AzureWhisperProvider(
      () => makeMockClient("error") as never,
    );

    const result = await provider.transcribe(TEST_BUFFER, TEST_FILENAME);

    expect(result.success).toBe(false);
    expect(result.text).toBeNull();
    expect(result.provider).toBe("azure");
    expect(result.error).toContain("Azure Whisper transcription failed");
    expect(result.error).toContain("Azure API returned 500");
  });

  it("returns timeout error when client throws timeout-shaped error", async () => {
    setValidEnv();
    const provider = new AzureWhisperProvider(
      () => makeMockClient("timeout") as never,
    );

    const result = await provider.transcribe(TEST_BUFFER, TEST_FILENAME);

    expect(result.success).toBe(false);
    expect(result.text).toBeNull();
    expect(result.provider).toBe("azure");
    expect(result.error).toContain("timed out");
  });

  it("returns config error when AZURE_OPENAI_ENDPOINT is missing", async () => {
    clearEnv();
    process.env.AZURE_OPENAI_API_KEY = "test-key";
    process.env.AZURE_OPENAI_WHISPER_DEPLOYMENT_ID = "whisper";

    const provider = new AzureWhisperProvider();
    const result = await provider.transcribe(TEST_BUFFER, TEST_FILENAME);

    expect(result.success).toBe(false);
    expect(result.text).toBeNull();
    expect(result.provider).toBe("azure");
    expect(result.error).toBe(
      "Azure-Konfiguration unvollstaendig: AZURE_OPENAI_ENDPOINT",
    );
  });

  it("returns config error when AZURE_OPENAI_API_KEY is missing", async () => {
    clearEnv();
    process.env.AZURE_OPENAI_ENDPOINT = "https://x.westeurope.openai.azure.com";
    process.env.AZURE_OPENAI_WHISPER_DEPLOYMENT_ID = "whisper";

    const provider = new AzureWhisperProvider();
    const result = await provider.transcribe(TEST_BUFFER, TEST_FILENAME);

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Azure-Konfiguration unvollstaendig: AZURE_OPENAI_API_KEY",
    );
  });

  it("returns config error when AZURE_OPENAI_WHISPER_DEPLOYMENT_ID is missing", async () => {
    clearEnv();
    process.env.AZURE_OPENAI_ENDPOINT = "https://x.westeurope.openai.azure.com";
    process.env.AZURE_OPENAI_API_KEY = "test-key";

    const provider = new AzureWhisperProvider();
    const result = await provider.transcribe(TEST_BUFFER, TEST_FILENAME);

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Azure-Konfiguration unvollstaendig: AZURE_OPENAI_WHISPER_DEPLOYMENT_ID",
    );
  });

  it("uses default API version when AZURE_OPENAI_API_VERSION is not set", async () => {
    clearEnv();
    process.env.AZURE_OPENAI_ENDPOINT = "https://x.westeurope.openai.azure.com";
    process.env.AZURE_OPENAI_API_KEY = "test-key";
    process.env.AZURE_OPENAI_WHISPER_DEPLOYMENT_ID = "whisper";

    const captured: { apiVersion?: string } = {};
    const provider = new AzureWhisperProvider((config) => {
      captured.apiVersion = config.apiVersion;
      return makeMockClient("success") as never;
    });

    await provider.transcribe(TEST_BUFFER, TEST_FILENAME);

    expect(captured.apiVersion).toBe("2024-06-01");
  });

  it("emits audit-log entry on successful call", async () => {
    setValidEnv();
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const provider = new AzureWhisperProvider(
      () => makeMockClient("success") as never,
    );

    await provider.transcribe(TEST_BUFFER, TEST_FILENAME);

    expect(infoSpy).toHaveBeenCalled();
    const logCall = infoSpy.mock.calls[0]?.[0];
    expect(typeof logCall).toBe("string");
    expect(logCall).toContain("[Whisper/Azure]");
    const jsonPart = (logCall as string).slice("[Whisper/Azure] ".length);
    const parsed = JSON.parse(jsonPart);
    expect(parsed.provider).toBe("azure");
    expect(parsed.region).toBe("westeurope");
    expect(parsed.model).toBe("whisper");
    expect(parsed.deployment).toBe("whisper-deployment");
    expect(parsed.success).toBe(true);
  });
});
