import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  IsKnowledgeError,
  ingestKnowledge,
} from "@/lib/is-knowledge/client";
import type { IsKnowledgeIngestItem } from "@/lib/is-knowledge/types";

const VALID_KEY = "test-service-key-min-32-chars-or-longer-xxx";
const BASE_URL = "https://is.test.local";

function itemFixture(
  overrides: Partial<IsKnowledgeIngestItem> = {}
): IsKnowledgeIngestItem {
  return {
    title: "Win-Pattern Beratung small",
    body_markdown: "Destillierte Lessons.",
    domain: "sales",
    source_system: "business_system",
    source_reference: "bs-winloss-2026-W24-branche:beratung-size:small-won",
    tags: ["winloss", "branche:beratung"],
    metadata: { deal_count: 3 },
    ...overrides,
  };
}

function responseOk(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
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

describe("ingestKnowledge — V8.7-B SLC-355 MT-1 (AC-355-1)", () => {
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

  it("happy-path: POST /api/knowledge/ingest with auth headers + JSON body, returns counts", async () => {
    fetchMock.mockResolvedValueOnce(
      responseOk(200, { inserted: 2, deduped: 0, failed: 0, summary: "ok" })
    );

    const result = await ingestKnowledge([
      itemFixture(),
      itemFixture({ source_reference: "bs-winloss-2026-W24-branche:it-size:large-lost" }),
    ]);

    expect(result).toEqual({ inserted: 2, deduped: 0, failed: 0 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(calledUrl).toBe(`${BASE_URL}/api/knowledge/ingest`);
    expect(calledInit.method).toBe("POST");

    const headers = calledInit.headers as Record<string, string>;
    expect(headers["x-strategaize-service-key"]).toBe(VALID_KEY);
    expect(headers["x-strategaize-consumer"]).toBe("business-system");
    expect(headers["Content-Type"]).toBe("application/json");

    const sentBody = JSON.parse(calledInit.body as string) as {
      items: IsKnowledgeIngestItem[];
    };
    expect(sentBody.items).toHaveLength(2);
    expect(sentBody.items[0].source_system).toBe("business_system");
  });

  it("207 partial-fail is parsed as success body (inserted/deduped/failed)", async () => {
    fetchMock.mockResolvedValueOnce(
      responseOk(207, { inserted: 1, deduped: 1, failed: 1, summary: "partial" })
    );

    const result = await ingestKnowledge([itemFixture()]);
    expect(result).toEqual({ inserted: 1, deduped: 1, failed: 1 });
  });

  it("empty items array throws without hitting the wire", async () => {
    await expect(ingestKnowledge([])).rejects.toBeInstanceOf(IsKnowledgeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("more than 100 items throws without hitting the wire (caller must chunk)", async () => {
    const items = Array.from({ length: 101 }, (_, i) =>
      itemFixture({ source_reference: `bs-winloss-ref-${i}` })
    );
    await expect(ingestKnowledge(items)).rejects.toBeInstanceOf(IsKnowledgeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("401 unauthorized -> IsKnowledgeError(kind='auth', status=401)", async () => {
    fetchMock.mockResolvedValueOnce(responseErr(401, { error: "unauthorized" }));

    await expect(ingestKnowledge([itemFixture()])).rejects.toMatchObject({
      name: "IsKnowledgeError",
      kind: "auth",
      status: 401,
    });
  });

  it("429 rate-limited with Retry-After -> kind='rate_limit', retryAfterSeconds=30", async () => {
    fetchMock.mockResolvedValueOnce(
      responseErr(
        429,
        { error: "rate_limited", retry_after_seconds: 30 },
        { "Retry-After": "30" }
      )
    );

    try {
      await ingestKnowledge([itemFixture()]);
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(IsKnowledgeError);
      const err = e as IsKnowledgeError;
      expect(err.kind).toBe("rate_limit");
      expect(err.status).toBe(429);
      expect(err.retryAfterSeconds).toBe(30);
    }
  });

  it("400 bad-payload -> kind='server', status=400", async () => {
    fetchMock.mockResolvedValueOnce(
      responseErr(400, { error: "invalid_payload" })
    );

    await expect(ingestKnowledge([itemFixture()])).rejects.toMatchObject({
      name: "IsKnowledgeError",
      kind: "server",
      status: 400,
    });
  });

  it("500 server-error -> kind='server', status=500", async () => {
    fetchMock.mockResolvedValueOnce(responseErr(500, { error: "boom" }));

    await expect(ingestKnowledge([itemFixture()])).rejects.toMatchObject({
      name: "IsKnowledgeError",
      kind: "server",
      status: 500,
    });
  });

  it("network-error (fetch rejects) -> kind='network'", async () => {
    fetchMock.mockRejectedValueOnce(
      new TypeError("fetch failed: ENOTFOUND is.test.local")
    );

    await expect(ingestKnowledge([itemFixture()])).rejects.toMatchObject({
      name: "IsKnowledgeError",
      kind: "network",
    });
  });

  it("schema-mismatch response -> kind='server'", async () => {
    fetchMock.mockResolvedValueOnce(responseOk(200, { wrong: "shape" }));

    await expect(ingestKnowledge([itemFixture()])).rejects.toMatchObject({
      name: "IsKnowledgeError",
      kind: "server",
    });
  });
});
