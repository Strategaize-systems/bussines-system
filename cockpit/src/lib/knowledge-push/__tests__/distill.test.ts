// V8.7-B SLC-355 MT-3 — Bedrock-Verdichtungs-Pass (R-355-1).
// Deckt AC-355-3 (Klassifikation, kein Name im Prompt, fail-soft) + AC-355-8 (Cost).

import { describe, expect, it, vi } from "vitest";

import { classifyObjections, distillWinLossBucket } from "../distill";
import type { ObjectionGroup, WinLossBucket } from "../types";

const MODEL_ID = "eu.anthropic.claude-sonnet-4-6";

function llmOk(text: string) {
  return {
    success: true as const,
    data: text,
    error: null,
    raw: text,
    usage: { input_tokens: 1200, output_tokens: 300 },
    modelId: MODEL_ID,
  };
}

function llmFail() {
  return {
    success: false as const,
    data: null,
    error: "Bedrock invocation failed",
  };
}

function bucketFixture(overrides: Partial<WinLossBucket> = {}): WinLossBucket {
  return {
    branche: "Beratung",
    sizeBucket: "small",
    targetStatus: "won",
    dealCount: 3,
    runMarkdowns: ["Gewonnen weil schnelle Reaktion."],
    ...overrides,
  };
}

function groupFixture(overrides: Partial<ObjectionGroup> = {}): ObjectionGroup {
  return {
    branche: "IT",
    noteCount: 2,
    notes: ["Zu teuer", "Kein Budget dieses Quartal"],
    ...overrides,
  };
}

describe("distillWinLossBucket — AC-355-3 / AC-355-8", () => {
  it("happy-path: liefert Markdown + USD-Kosten aus usage", async () => {
    const queryLLM = vi.fn().mockResolvedValue(llmOk("## Lessons\nMuster X"));

    const result = await distillWinLossBucket(bucketFixture(), { queryLLM });

    expect(result).not.toBeNull();
    expect(result!.markdown).toContain("Lessons");
    // 1200/1000*0.003 + 300/1000*0.015 = 0.0036 + 0.0045 = 0.0081
    expect(result!.costUsd).toBeCloseTo(0.0081, 6);
    expect(queryLLM).toHaveBeenCalledTimes(1);
  });

  it("temperature 0.2 + System-Prompt mit Anonymisierungs-Auflage", async () => {
    const queryLLM = vi.fn().mockResolvedValue(llmOk("ok"));
    await distillWinLossBucket(bucketFixture(), { queryLLM });

    const [, systemPrompt, opts] = queryLLM.mock.calls[0];
    expect(opts.temperature).toBe(0.2);
    expect(typeof opts.maxTokens).toBe("number");
    expect(systemPrompt.toLowerCase()).toMatch(/anonym|keine namen|no names/);
  });

  it("strippt rohe Email/Telefon aus Markdowns VOR dem Prompt (pre-prompt redact)", async () => {
    const queryLLM = vi.fn().mockResolvedValue(llmOk("ok"));
    await distillWinLossBucket(
      bucketFixture({
        runMarkdowns: ["Kontakt war max@acme.com / +49 30 1234567 — gewonnen."],
      }),
      { queryLLM }
    );

    const [userPrompt] = queryLLM.mock.calls[0] as [string];
    expect(userPrompt).not.toContain("max@acme.com");
    expect(userPrompt).not.toContain("1234567");
    expect(userPrompt).toContain("[email]");
    expect(userPrompt).toContain("[phone]");
  });

  it("LLM-Fehler -> null (fail-soft Skip)", async () => {
    const queryLLM = vi.fn().mockResolvedValue(llmFail());
    const result = await distillWinLossBucket(bucketFixture(), { queryLLM });
    expect(result).toBeNull();
  });

  it("leeres LLM-Ergebnis -> null", async () => {
    const queryLLM = vi.fn().mockResolvedValue(llmOk("   "));
    const result = await distillWinLossBucket(bucketFixture(), { queryLLM });
    expect(result).toBeNull();
  });

  it("unbekanntes Model -> Markdown bleibt, Cost faellt auf 0 (fail-soft Cost)", async () => {
    const queryLLM = vi.fn().mockResolvedValue({
      success: true,
      data: "## Lessons",
      error: null,
      usage: { input_tokens: 100, output_tokens: 50 },
      modelId: "unknown-model-xyz",
    });
    const result = await distillWinLossBucket(bucketFixture(), { queryLLM });
    expect(result!.markdown).toContain("Lessons");
    expect(result!.costUsd).toBe(0);
  });

  it("LLM-Exception -> null (fail-soft)", async () => {
    const queryLLM = vi.fn().mockRejectedValue(new Error("network"));
    const result = await distillWinLossBucket(bucketFixture(), { queryLLM });
    expect(result).toBeNull();
  });
});

describe("classifyObjections — AC-355-3 / AC-355-8", () => {
  it("happy-path: Markdown + Kosten, Taxonomie-Hint im System-Prompt", async () => {
    const queryLLM = vi.fn().mockResolvedValue(llmOk("## Einwände\n- Preis"));

    const result = await classifyObjections(groupFixture(), { queryLLM });
    expect(result).not.toBeNull();
    expect(result!.markdown).toContain("Einwände");
    expect(result!.costUsd).toBeCloseTo(0.0081, 6);

    const [, systemPrompt] = queryLLM.mock.calls[0];
    expect(systemPrompt.toLowerCase()).toMatch(/einwand|objection|taxonom/);
  });

  it("strippt rohe PII aus Notizen vor dem Prompt", async () => {
    const queryLLM = vi.fn().mockResolvedValue(llmOk("ok"));
    await classifyObjections(
      groupFixture({ notes: ["Anruf an +49 171 9998887 — kein Budget"] }),
      { queryLLM }
    );
    const [userPrompt] = queryLLM.mock.calls[0] as [string];
    expect(userPrompt).not.toContain("9998887");
    expect(userPrompt).toContain("[phone]");
  });

  it("LLM-Fehler -> null (fail-soft)", async () => {
    const queryLLM = vi.fn().mockResolvedValue(llmFail());
    const result = await classifyObjections(groupFixture(), { queryLLM });
    expect(result).toBeNull();
  });
});
