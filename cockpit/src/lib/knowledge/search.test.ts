import { describe, it, expect, vi, beforeEach } from "vitest";

// V8.12 SLC-906 MT-7 (SLC-905 D-905-4): Caller-Mode-Switch fuer searchKnowledge.
// UI-Caller (Default) -> User-Client (RLS aktiv via auth.uid()).
// Cron-Caller (serviceMode=true) -> Admin-Client (BYPASSRLS).

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/ai/embeddings", () => ({
  getEmbeddingProvider: vi.fn(() => ({
    embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  })),
}));

vi.mock("@/lib/ai/bedrock-client", () => ({
  queryLLM: vi.fn(),
}));

const { searchKnowledge } = await import("./search");
const { createClient } = await import("@/lib/supabase/server");
const { createAdminClient } = await import("@/lib/supabase/admin");

function makeClientMock() {
  const rpcMock = vi.fn().mockResolvedValue({
    data: [
      {
        id: "chunk-1",
        source_type: "meeting",
        source_id: "src-1",
        chunk_index: 0,
        chunk_text: "Lorem ipsum",
        metadata: {},
        similarity: 0.8,
      },
    ],
    error: null,
  });
  return { client: { rpc: rpcMock }, rpcMock };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("searchKnowledge — Caller-Mode-Switch (MT-7)", () => {
  it("UI-Caller (default) uses User-Client (createClient), NOT admin", async () => {
    const userMock = makeClientMock();
    const adminMock = makeClientMock();
    vi.mocked(createClient).mockResolvedValue(userMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);

    const chunks = await searchKnowledge("test query", {
      scope: "deal",
      dealId: "deal-1",
    });

    expect(chunks).toHaveLength(1);
    expect(vi.mocked(createClient)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
    expect(userMock.rpcMock).toHaveBeenCalledWith(
      "search_knowledge_chunks",
      expect.objectContaining({
        filter_scope: "deal",
        filter_id: "deal-1",
      }),
    );
    expect(adminMock.rpcMock).not.toHaveBeenCalled();
  });

  it("Cron-Caller (serviceMode=true) uses Admin-Client, NOT User-Client", async () => {
    const userMock = makeClientMock();
    const adminMock = makeClientMock();
    vi.mocked(createClient).mockResolvedValue(userMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);

    const chunks = await searchKnowledge("cron query", {
      scope: "deal",
      dealId: "deal-1",
      serviceMode: true,
    });

    expect(chunks).toHaveLength(1);
    expect(vi.mocked(createAdminClient)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(createClient)).not.toHaveBeenCalled();
    expect(adminMock.rpcMock).toHaveBeenCalledTimes(1);
    expect(userMock.rpcMock).not.toHaveBeenCalled();
  });
});
