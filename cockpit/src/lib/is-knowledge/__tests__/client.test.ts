import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  IsKnowledgeError,
  searchKnowledge,
  type KnowledgeSearchHit,
} from "@/lib/is-knowledge/client";

const VALID_KEY = "test-service-key-min-32-chars-or-longer-xxx";
const BASE_URL = "https://is.test.local";

function hitFixture(
  overrides: Partial<KnowledgeSearchHit> = {}
): KnowledgeSearchHit {
  return {
    id: "k1",
    title: "Pattern X",
    body_markdown: "Body",
    domain: "sales",
    tags: ["pattern"],
    source_system: "founder",
    source_reference: null,
    metadata: {},
    similarity: 0.95,
    ...overrides,
  };
}

function responseOk(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function responseErr(
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("searchKnowledge — V8.7-A SLC-871 MT-1 (DEC-250 / DEC-253 / DEC-256)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("STRATEGAIZE_KNOWLEDGE_SERVICE_KEY", VALID_KEY);
    vi.stubEnv("STRATEGAIZE_KNOWLEDGE_API_BASE_URL", BASE_URL);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fetchMock.mockReset();
    vi.useRealTimers();
  });

  it("happy-path: GET /api/knowledge/search with auth headers, PII-redacted q, returns parsed result", async () => {
    fetchMock.mockResolvedValueOnce(
      responseOk({
        items: [hitFixture(), hitFixture({ id: "k2", similarity: 0.81 })],
        query_embedding_cost_usd: 0.0001,
        total_ms: 142,
      })
    );

    const result = await searchKnowledge(
      "Vollmacht-Klausel test@example.com bei +49 30 123456",
      { limit: 5 }
    );

    expect(result.items).toHaveLength(2);
    expect(result.query_embedding_cost_usd).toBeCloseTo(0.0001);
    expect(result.total_ms).toBe(142);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];

    // Original q with email + phone NEVER reaches the wire (DEC-250).
    expect(calledUrl).not.toContain("test@example.com");
    expect(calledUrl).not.toContain("123456");
    expect(decodeURIComponent(calledUrl)).toContain("[email]");
    expect(decodeURIComponent(calledUrl)).toContain("[phone]");

    expect(calledUrl.startsWith(`${BASE_URL}/api/knowledge/search`)).toBe(
      true
    );
    expect(calledUrl).toContain("limit=5");

    const headers = calledInit.headers as Record<string, string>;
    expect(headers["x-strategaize-service-key"]).toBe(VALID_KEY);
    expect(headers["x-strategaize-consumer"]).toBe("business-system");
  });

  it("401 unauthorized -> IsKnowledgeError(kind='auth', status=401)", async () => {
    fetchMock.mockResolvedValueOnce(
      responseErr(401, { error: "unauthorized" })
    );

    await expect(searchKnowledge("test")).rejects.toMatchObject({
      name: "IsKnowledgeError",
      kind: "auth",
      status: 401,
    });
  });

  it("429 rate_limited with Retry-After header -> kind='rate_limit', retryAfterSeconds=30", async () => {
    fetchMock.mockResolvedValueOnce(
      responseErr(
        429,
        { error: "rate_limited", retry_after_seconds: 30 },
        { "Retry-After": "30" }
      )
    );

    try {
      await searchKnowledge("test");
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(IsKnowledgeError);
      const err = e as IsKnowledgeError;
      expect(err.kind).toBe("rate_limit");
      expect(err.status).toBe(429);
      expect(err.retryAfterSeconds).toBe(30);
    }
  });

  it("500 server-error -> kind='server', status=500", async () => {
    fetchMock.mockResolvedValueOnce(
      responseErr(500, { error: "search_failed", details: "rpc broken" })
    );

    await expect(searchKnowledge("test")).rejects.toMatchObject({
      name: "IsKnowledgeError",
      kind: "server",
      status: 500,
    });
  });

  it("timeout (>4s without response) -> kind='timeout'", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_url, init: RequestInit) => {
      return new Promise((_, reject) => {
        init.signal?.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });

    // Pre-hook .rejects BEFORE advancing timers, sonst gibt es einen kurzen
    // unhandled-rejection-Window zwischen advanceTimers (triggert abort) und
    // dem await expect().rejects.
    const assertion = expect(searchKnowledge("test")).rejects.toMatchObject({
      name: "IsKnowledgeError",
      kind: "timeout",
    });
    await vi.advanceTimersByTimeAsync(4001);
    await assertion;
  });

  it("network-error (fetch rejects with TypeError) -> kind='network'", async () => {
    fetchMock.mockRejectedValueOnce(
      new TypeError("fetch failed: ENOTFOUND is.test.local")
    );

    await expect(searchKnowledge("test")).rejects.toMatchObject({
      name: "IsKnowledgeError",
      kind: "network",
    });
  });

  it("empty-result: 200 with items=[] returns valid result with empty array", async () => {
    fetchMock.mockResolvedValueOnce(
      responseOk({
        items: [],
        query_embedding_cost_usd: 0.00009,
        total_ms: 88,
      })
    );

    const result = await searchKnowledge("nichts dergleichen");
    expect(result.items).toHaveLength(0);
    expect(result.query_embedding_cost_usd).toBeCloseTo(0.00009);
  });

  it("domain-filter-param is forwarded as query string", async () => {
    fetchMock.mockResolvedValueOnce(
      responseOk({
        items: [hitFixture()],
        query_embedding_cost_usd: 0.0001,
        total_ms: 100,
      })
    );

    await searchKnowledge("test", { domain: "sales", limit: 3 });

    const [calledUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toContain("domain=sales");
    expect(calledUrl).toContain("limit=3");
  });
});
