import { describe, it, expect, vi, beforeEach } from "vitest";

// V8.12 SLC-906 MT-5 Regression-Test fuer ISSUE-094 (No-Op-Befund).
// document-actions.ts wurde bereits in V8.10 SLC-893 MT-4 auf User-Client
// umgestellt. Dieser Test verhindert ein Reintroducing von createAdminClient.

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/read-only-context", () => ({
  assertNotReadOnlyContext: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/knowledge/indexer", () => ({
  indexDocument: vi.fn().mockResolvedValue({ stored: 0 }),
}));

vi.mock("@/lib/knowledge/chunker", () => ({
  isExtractableFormat: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/storage/document-path", () => ({
  buildDocumentStoragePath: vi.fn(() => "test-user-id/test-path/file.pdf"),
}));

const {
  getDocuments,
  uploadDocument,
  deleteDocument,
  getDocumentUrl,
} = await import("./document-actions");
const { createClient } = await import("@/lib/supabase/server");
const { createAdminClient } = await import("@/lib/supabase/admin");

const USER_ID = "55555555-5555-5555-5555-555555555555";

function makeUserClientMock() {
  const inserts: Array<{ table: string; payload: unknown }> = [];
  const deletes: Array<{ table: string; id: unknown }> = [];

  const fromMock = vi.fn((_table: string) => ({
    select: () => ({
      order: () => ({
        eq: () =>
          Promise.resolve({ data: [], error: null }),
        then: (cb: (v: { data: unknown; error: unknown }) => unknown) =>
          Promise.resolve({ data: [], error: null }).then(cb),
      }),
    }),
    insert: (payload: unknown) => {
      inserts.push({ table: _table, payload });
      return {
        select: () => ({
          single: () =>
            Promise.resolve({
              data: { id: "doc-1" },
              error: null,
            }),
        }),
      };
    },
    delete: () => ({
      eq: (_col: string, val: unknown) => {
        deletes.push({ table: _table, id: val });
        return Promise.resolve({ error: null });
      },
    }),
  }));

  const storageMock = {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ error: null }),
      remove: vi.fn().mockResolvedValue({ error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: "https://signed.example/file.pdf" },
        error: null,
      }),
    })),
  };

  const getUser = vi.fn().mockResolvedValue({
    data: { user: { id: USER_ID } },
    error: null,
  });

  return {
    client: { from: fromMock, auth: { getUser }, storage: storageMock },
    inserts,
    deletes,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("document-actions: User-Client-Only Regression (ISSUE-094)", () => {
  it("getDocuments uses User-Client only", async () => {
    const mock = makeUserClientMock();
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    await getDocuments({ dealId: "deal-1" });
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });

  it("uploadDocument uses User-Client only", async () => {
    const mock = makeUserClientMock();
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const fd = new FormData();
    const file = new File(["content"], "test.pdf", { type: "application/pdf" });
    fd.append("file", file);
    fd.append("deal_id", "deal-1");

    const result = await uploadDocument(fd);
    expect(result.error).toBe("");
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
    expect(mock.inserts).toHaveLength(1);
  });

  it("deleteDocument uses User-Client only", async () => {
    const mock = makeUserClientMock();
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await deleteDocument("doc-1", "u/1.pdf");
    expect(result.error).toBe("");
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
    expect(mock.deletes).toHaveLength(1);
  });

  it("getDocumentUrl uses User-Client only", async () => {
    const mock = makeUserClientMock();
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const url = await getDocumentUrl("u/1.pdf");
    expect(url).toBe("https://signed.example/file.pdf");
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });
});
