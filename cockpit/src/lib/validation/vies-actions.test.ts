import { describe, it, expect, vi, beforeEach } from "vitest";

// V8.15 SLC-913 MT-2 (ISSUE-121): Auth-Gate vor VIES-Call/Admin-Write.

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({}),
}));

vi.mock("./vies-client", () => ({
  lookupVatId: vi.fn(),
}));

const { lookupVatIdAction } = await import("./vies-actions");
const { createClient } = await import("@/lib/supabase/server");
const { lookupVatId } = await import("./vies-client");

function mockAuth(user: { id: string } | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("lookupVatIdAction (ISSUE-121: Auth-Gate)", () => {
  it("wirft fuer unauthentifizierte Caller — kein VIES-Call, kein Admin-Write", async () => {
    mockAuth(null);

    await expect(lookupVatIdAction("DE123456789")).rejects.toThrow(
      /Nicht authentifiziert/,
    );
    expect(vi.mocked(lookupVatId)).not.toHaveBeenCalled();
  });

  it("authentifiziert + ungueltiges Format -> format_only ohne VIES-Call", async () => {
    mockAuth({ id: "user-1" });

    const result = await lookupVatIdAction("XX-not-a-vat");
    expect(result.is_valid).toBe(false);
    expect(result.source).toBe("format_only");
    expect(vi.mocked(lookupVatId)).not.toHaveBeenCalled();
  });

  it("authentifiziert + valides Format -> VIES-Lookup laeuft", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(lookupVatId).mockResolvedValue({
      is_valid: true,
      source: "vies",
      vies_response: { name: "Test GmbH" },
    } as never);

    const result = await lookupVatIdAction("DE123456789");
    expect(result.is_valid).toBe(true);
    expect(result.format_country).toBe("DE");
    expect(result.vies_name).toBe("Test GmbH");
    expect(vi.mocked(lookupVatId)).toHaveBeenCalledTimes(1);
  });
});
