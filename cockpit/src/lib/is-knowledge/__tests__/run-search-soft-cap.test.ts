import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { envelopeToErrorString, runIsSearchWithSoftCap } from "@/lib/is-knowledge/run-search-soft-cap";
import { SOFT_CAP_ERROR_MARKER } from "@/lib/is-knowledge/format-hits";

const VALID_KEY = "test-service-key-min-32-chars-or-longer-xxx";

function responseOk(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("runIsSearchWithSoftCap — MT-4 (DEC-252 + DEC-256)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("STRATEGAIZE_KNOWLEDGE_SERVICE_KEY", VALID_KEY);
    vi.stubEnv(
      "STRATEGAIZE_KNOWLEDGE_API_BASE_URL",
      "https://is.test.local"
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fetchMock.mockReset();
  });

  it("returns kind='skipped' when softCapReached=true (no fetch call)", async () => {
    const envelope = await runIsSearchWithSoftCap("test", {
      softCapReached: true,
    });
    expect(envelope.kind).toBe("skipped");
    if (envelope.kind === "skipped") {
      expect(envelope.reason).toBe("soft_cap_reached");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns kind='ok' with items + cost + ms on happy fetch", async () => {
    fetchMock.mockResolvedValueOnce(
      responseOk({
        items: [
          {
            id: "k1",
            title: "Pattern",
            body_markdown: "body",
            domain: "sales",
            tags: [],
            source_system: "founder",
            source_reference: null,
            metadata: {},
            similarity: 0.9,
          },
        ],
        query_embedding_cost_usd: 0.0001,
        total_ms: 120,
      })
    );

    const envelope = await runIsSearchWithSoftCap("test", { domain: "sales", limit: 5 });
    expect(envelope.kind).toBe("ok");
    if (envelope.kind === "ok") {
      expect(envelope.items.length).toBe(1);
      expect(envelope.queryEmbeddingCostUsd).toBeCloseTo(0.0001);
      expect(envelope.totalMs).toBe(120);
    }
  });

  it("returns kind='error' with user-facing message on IsKnowledgeError (401)", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 })
    );

    const envelope = await runIsSearchWithSoftCap("test");
    expect(envelope.kind).toBe("error");
    if (envelope.kind === "error") {
      expect(envelope.userMessage).toContain("Authentifizierungs-Fehler");
      expect(envelope.isError.kind).toBe("auth");
    }
  });

  it("returns kind='error' on rate_limit too", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { "Retry-After": "30" },
      })
    );

    const envelope = await runIsSearchWithSoftCap("test");
    expect(envelope.kind).toBe("error");
    if (envelope.kind === "error") {
      expect(envelope.userMessage).toContain("ueberlastet");
      expect(envelope.isError.kind).toBe("rate_limit");
      expect(envelope.isError.retryAfterSeconds).toBe(30);
    }
  });
});

describe("envelopeToErrorString — MT-4", () => {
  it("returns null for ok envelope", () => {
    expect(
      envelopeToErrorString({
        kind: "ok",
        items: [],
        queryEmbeddingCostUsd: 0,
        totalMs: 0,
      })
    ).toBeNull();
  });

  it("returns SOFT_CAP_ERROR_MARKER for skipped envelope", () => {
    expect(
      envelopeToErrorString({
        kind: "skipped",
        reason: "soft_cap_reached",
      })
    ).toBe(SOFT_CAP_ERROR_MARKER);
  });

  it("returns userMessage for error envelope", () => {
    const userMessage = "Strategaize-Wissens-Basis aktuell nicht erreichbar";
    expect(
      envelopeToErrorString({
        kind: "error",
        userMessage,
        isError: { kind: "timeout" } as never,
      })
    ).toBe(userMessage);
  });
});
