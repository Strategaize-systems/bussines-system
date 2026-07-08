// V8.16 SLC-914 MT-1 (ISSUE-131): checkConsentStatus optional client-Pass-Through.
// Ohne Argument => createAdminClient (backward-compat). Mit Client => dieser Client
// (RLS-scoped), createAdminClient wird NICHT aufgerufen.
// V8.17 SLC-915 MT-2 (ISSUE-142): fail-closed — angeforderte IDs ohne Row (RLS-
// weggefiltert / nicht existent) muessen als missing zaehlen, nicht still verschwinden.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

const { checkConsentStatus } = await import("./consent-check");
const { createAdminClient } = await import("@/lib/supabase/admin");

const CONTACTS = [
  { id: "c1", first_name: "A", last_name: "B", email: "a@x.de", consent_status: "granted" },
  { id: "c2", first_name: "C", last_name: "D", email: "c@x.de", consent_status: null },
];

function makeClient(rows: typeof CONTACTS = CONTACTS) {
  const from = vi.fn(() => ({
    select: () => ({ in: () => Promise.resolve({ data: rows, error: null }) }),
  }));
  return { from };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("checkConsentStatus client pass-through", () => {
  it("short-circuits on empty input without touching any client", async () => {
    const result = await checkConsentStatus([]);
    expect(result).toEqual({ allGranted: true, missing: [], granted: [] });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("uses the passed client and does NOT fall back to createAdminClient", async () => {
    const client = makeClient();
    const result = await checkConsentStatus(["c1", "c2"], client as never);

    expect(client.from).toHaveBeenCalledWith("contacts");
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(result.allGranted).toBe(false);
    expect(result.granted.map((c) => c.id)).toEqual(["c1"]);
    expect(result.missing.map((c) => c.id)).toEqual(["c2"]);
  });

  it("falls back to createAdminClient when no client is passed", async () => {
    const admin = makeClient();
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    await checkConsentStatus(["c1", "c2"]);
    expect(createAdminClient).toHaveBeenCalledTimes(1);
    expect(admin.from).toHaveBeenCalledWith("contacts");
  });

  // ISSUE-142 — fail-closed
  it("treats an RLS-filtered contact (row not returned) as missing, allGranted=false", async () => {
    // 2 IDs angefordert, DB liefert nur c1 (granted) — c2 per RLS weggefiltert.
    const client = makeClient([CONTACTS[0]]);
    const result = await checkConsentStatus(["c1", "c2"], client as never);

    expect(result.allGranted).toBe(false);
    expect(result.granted.map((c) => c.id)).toEqual(["c1"]);
    expect(result.missing.map((c) => c.id)).toContain("c2");
  });

  it("treats every requested id as missing when the query returns no rows", async () => {
    const client = makeClient([]);
    const result = await checkConsentStatus(["c1", "c2"], client as never);

    expect(result.allGranted).toBe(false);
    expect(result.missing.map((c) => c.id).sort()).toEqual(["c1", "c2"]);
    expect(result.granted).toEqual([]);
  });
});
