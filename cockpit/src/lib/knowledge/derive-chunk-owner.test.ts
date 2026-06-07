// =============================================================
// Unit-Tests deriveChunkOwner (SLC-905 MT-5)
// =============================================================
// Pure-Function-Tests mit gemockten Supabase-Client-Chains.
// Pattern-Quelle: V8.10 SLC-893 derived-Storage-Path-Tests.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { deriveChunkOwner } from "./derive-chunk-owner";

interface MockChain {
  data?: Record<string, unknown> | null;
  error?: { message: string } | null;
}

/**
 * Mock-Builder fuer Supabase-Client-Chain admin.from(t).select(c).eq("id", id).single().
 * Reagiert auf table-Argument: liefert (data, error) je nach Setup pro Tabelle.
 */
function mockSupabase(setup: Record<string, MockChain>) {
  return {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => setup[table] ?? { data: null, error: { message: "no mock setup" } }),
        })),
      })),
    })),
  };
}

describe("deriveChunkOwner — Source-Type-Routing", () => {
  beforeEach(() => vi.clearAllMocks());

  it("meeting → meetings.owner_user_id + profiles.team_id", async () => {
    const admin = mockSupabase({
      meetings: { data: { owner_user_id: "user-1" }, error: null },
      profiles: { data: { team_id: "team-1" }, error: null },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await deriveChunkOwner(admin as any, "meeting", "src-1");
    expect(result).toEqual({ owner_user_id: "user-1", team_id: "team-1" });
    expect(admin.from).toHaveBeenCalledWith("meetings");
    expect(admin.from).toHaveBeenCalledWith("profiles");
  });

  it("email → email_messages.owner_user_id + profiles.team_id", async () => {
    const admin = mockSupabase({
      email_messages: { data: { owner_user_id: "user-2" }, error: null },
      profiles:       { data: { team_id: "team-2" }, error: null },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await deriveChunkOwner(admin as any, "email", "src-2");
    expect(result).toEqual({ owner_user_id: "user-2", team_id: "team-2" });
    expect(admin.from).toHaveBeenCalledWith("email_messages");
  });

  it("deal_activity → activities.owner_user_id + profiles.team_id", async () => {
    const admin = mockSupabase({
      activities: { data: { owner_user_id: "user-3" }, error: null },
      profiles:   { data: { team_id: "team-3" }, error: null },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await deriveChunkOwner(admin as any, "deal_activity", "src-3");
    expect(result).toEqual({ owner_user_id: "user-3", team_id: "team-3" });
    expect(admin.from).toHaveBeenCalledWith("activities");
  });

  it("document → documents.created_by + profiles.team_id (KEINE owner_user_id-Spalte)", async () => {
    const admin = mockSupabase({
      documents: { data: { created_by: "user-4" }, error: null },
      profiles:  { data: { team_id: "team-4" }, error: null },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await deriveChunkOwner(admin as any, "document", "src-4");
    expect(result).toEqual({ owner_user_id: "user-4", team_id: "team-4" });
    expect(admin.from).toHaveBeenCalledWith("documents");
  });

  it("team_id NULL ist erlaubt (Profile ohne team_id)", async () => {
    const admin = mockSupabase({
      meetings: { data: { owner_user_id: "user-5" }, error: null },
      profiles: { data: { team_id: null }, error: null },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await deriveChunkOwner(admin as any, "meeting", "src-5");
    expect(result).toEqual({ owner_user_id: "user-5", team_id: null });
  });
});

describe("deriveChunkOwner — Error-Pfade", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws bei unbekanntem sourceType", async () => {
    const admin = mockSupabase({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(deriveChunkOwner(admin as any, "unknown_source", "src-x"))
      .rejects.toThrow(/unbekannter sourceType 'unknown_source'/);
  });

  it("throws bei nicht-gefundener Parent-Source", async () => {
    const admin = mockSupabase({
      meetings: { data: null, error: { message: "no rows" } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(deriveChunkOwner(admin as any, "meeting", "missing-src"))
      .rejects.toThrow(/Parent-Source meetings\[missing-src\] nicht gefunden/);
  });

  it("throws bei NULL-owner-Spalte in Parent", async () => {
    const admin = mockSupabase({
      meetings: { data: { owner_user_id: null }, error: null },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(deriveChunkOwner(admin as any, "meeting", "src-orphan"))
      .rejects.toThrow(/meetings\[src-orphan\].owner_user_id ist NULL/);
  });

  it("throws bei nicht-gefundenem Profile", async () => {
    const admin = mockSupabase({
      meetings: { data: { owner_user_id: "user-6" }, error: null },
      profiles: { data: null, error: { message: "profile gone" } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(deriveChunkOwner(admin as any, "meeting", "src-6"))
      .rejects.toThrow(/profiles\[user-6\] nicht gefunden/);
  });
});
