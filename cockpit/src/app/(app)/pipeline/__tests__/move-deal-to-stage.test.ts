// V8 SLC-813 MT-3 — moveDealToStage Server-Action Tests.
//
// Verifiziert:
//   1. Ohne requirementValues + Deal hat Pflichtfeld-Luecke -> ok:false (V7-Pfad bleibt)
//   2. Mit requirementValues + Luecke gefuellt -> Pflichtfeld-Update + Stage-Move
//   3. Mit unzureichenden requirementValues -> ok:false (Pflichtfelder fehlen weiter)
//   4. Mit requirementValues + DB-Error in Pflichtfeld-Phase -> Stage-Move abgebrochen
//   5. Ohne requirementValues + alle Pflichtfelder gesetzt -> Stage-Move regulaer (Regression)

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/get-profile", () => ({
  getProfile: vi.fn(),
}));

vi.mock("@/lib/auth/read-only-context", () => ({
  assertNotReadOnlyContext: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
  logAuditWithId: vi.fn().mockResolvedValue("audit-id-stub"),
}));

vi.mock("@/lib/automation/dispatcher", () => ({
  dispatchAutomationTrigger: vi.fn().mockResolvedValue(undefined),
}));

const { moveDealToStage } = await import("../actions");
const { getProfile } = await import("@/lib/auth/get-profile");
const { createClient } = await import("@/lib/supabase/server");

function profile() {
  return {
    user_id: "user-1",
    role: "admin" as const,
    team_id: null,
    display_name: "Admin",
  };
}

interface DealRow {
  title: string;
  value: number | null;
  status: string;
  contact_id: string | null;
  company_id: string | null;
  won_lost_reason: string | null;
  stage_id: string | null;
  pipeline_stages: { name: string } | null;
}

function defaultDealRow(): DealRow {
  return {
    title: "ACME Coaching",
    value: 12000,
    status: "active",
    contact_id: "contact-1",
    company_id: "company-1",
    won_lost_reason: null,
    stage_id: "stage-old",
    pipeline_stages: { name: "Erstkontakt" },
  };
}

interface SupabaseMockOpts {
  dealRow?: DealRow | null;
  /** Wenn gesetzt: erste deals.update() returnt diesen Error. */
  firstUpdateError?: { message: string } | null;
  /** Wenn gesetzt: zweite deals.update() (Stage-Move) returnt diesen Error. */
  stageUpdateError?: { message: string } | null;
}

function makeSupabaseMock(opts: SupabaseMockOpts = {}) {
  const dealRow = opts.dealRow === undefined ? defaultDealRow() : opts.dealRow;
  const dealsUpdateCalls: Array<Record<string, unknown>> = [];
  const activitiesInsertCalls: Array<Record<string, unknown>> = [];
  let updateCallCount = 0;

  const from = vi.fn((table: string) => {
    if (table === "deals") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi
              .fn()
              .mockResolvedValue({ data: dealRow, error: null }),
          })),
        })),
        update: vi.fn((payload: Record<string, unknown>) => {
          dealsUpdateCalls.push(payload);
          updateCallCount += 1;
          const isFirst = updateCallCount === 1;
          const error = isFirst
            ? opts.firstUpdateError ?? null
            : opts.stageUpdateError ?? null;
          return {
            eq: vi.fn().mockResolvedValue({ error }),
          };
        }),
      };
    }
    if (table === "activities") {
      return {
        insert: vi.fn((row: Record<string, unknown>) => {
          activitiesInsertCalls.push(row);
          return Promise.resolve({ error: null });
        }),
      };
    }
    if (table === "audit_log") {
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    throw new Error(`unexpected table in mock: ${table}`);
  });
  return { from, dealsUpdateCalls, activitiesInsertCalls };
}

beforeEach(() => {
  vi.mocked(getProfile).mockReset();
  vi.mocked(createClient).mockReset();
  vi.mocked(getProfile).mockResolvedValue(profile());
});

describe("moveDealToStage — V8 SLC-813 MT-3", () => {
  it("Regression: ohne requirementValues + Pflichtfeld-Luecke -> Fehler-String, KEIN Update", async () => {
    const dealRow = { ...defaultDealRow(), won_lost_reason: null };
    const mock = makeSupabaseMock({ dealRow });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await moveDealToStage("deal-1", "stage-verloren", "Verloren");

    expect(result.error).toContain("Pflichtfelder");
    expect(result.error).toContain("Verlustgrund");
    expect(mock.dealsUpdateCalls).toHaveLength(0);
  });

  it("Mit requirementValues + Luecke gefuellt -> Pflichtfeld-Update + Stage-Move", async () => {
    const dealRow = { ...defaultDealRow(), won_lost_reason: null };
    const mock = makeSupabaseMock({ dealRow });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await moveDealToStage(
      "deal-1",
      "stage-verloren",
      "Verloren",
      { won_lost_reason: "Preis zu hoch" }
    );

    expect(result.error).toBe("");
    expect(mock.dealsUpdateCalls).toHaveLength(2);
    expect(mock.dealsUpdateCalls[0]).toMatchObject({
      won_lost_reason: "Preis zu hoch",
    });
    expect(mock.dealsUpdateCalls[1]).toMatchObject({
      stage_id: "stage-verloren",
      status: "lost",
    });
  });

  it("Mit unzureichenden requirementValues (Verhandlung braucht value+contact_id, nur value gesetzt) -> Fehler, KEIN Update", async () => {
    const dealRow = { ...defaultDealRow(), value: null, contact_id: null };
    const mock = makeSupabaseMock({ dealRow });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await moveDealToStage(
      "deal-1",
      "stage-verhandlung",
      "Verhandlung / Einwände",
      { value: 5000 }
    );

    expect(result.error).toContain("Pflichtfelder");
    expect(result.error).toContain("Kontakt");
    expect(mock.dealsUpdateCalls).toHaveLength(0);
  });

  it("Mit requirementValues + DB-Error in Pflichtfeld-Phase -> Stage-Move abgebrochen", async () => {
    const dealRow = { ...defaultDealRow(), won_lost_reason: null };
    const mock = makeSupabaseMock({
      dealRow,
      firstUpdateError: { message: "FK violation on won_lost_reason" },
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await moveDealToStage(
      "deal-1",
      "stage-verloren",
      "Verloren",
      { won_lost_reason: "X" }
    );

    expect(result.error).toContain("FK violation");
    expect(mock.dealsUpdateCalls).toHaveLength(1); // Stage-Move-Phase wurde NICHT erreicht
  });

  it("Regression: ohne requirementValues + alle Pflichtfelder gesetzt -> Stage-Move regulaer", async () => {
    const dealRow = {
      ...defaultDealRow(),
      value: 12000,
      contact_id: "contact-1",
    };
    const mock = makeSupabaseMock({ dealRow });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await moveDealToStage(
      "deal-1",
      "stage-verhandlung",
      "Verhandlung / Einwände"
    );

    expect(result.error).toBe("");
    expect(mock.dealsUpdateCalls).toHaveLength(1);
    expect(mock.dealsUpdateCalls[0]).toMatchObject({
      stage_id: "stage-verhandlung",
    });
  });

  it("Atomar: Pflichtfeld-Update + Stage-Update + Stage-Activity-Insert (= 2 deals.update + 2 activities.insert)", async () => {
    const dealRow = { ...defaultDealRow(), value: null };
    const mock = makeSupabaseMock({ dealRow });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    await moveDealToStage(
      "deal-1",
      "stage-gewonnen",
      "Gewonnen",
      { value: 25000 }
    );

    expect(mock.dealsUpdateCalls).toHaveLength(2);
    // 1. Pflichtfeld-Activity, 2. Stage-Change-Activity
    expect(mock.activitiesInsertCalls).toHaveLength(2);
    expect(mock.activitiesInsertCalls[0].title).toContain("Pflichtfeld-Set");
    expect(mock.activitiesInsertCalls[1].title).toContain("Gewonnen");
  });
});

// V8.15 SLC-913 MT-4 (ISSUE-115): Mass-Assignment-Whitelist.
// requirementValues ist Raw-Client-Input — nur die fuer die Ziel-Stage
// deklarierten STAGE_REQUIRED_FIELDS-Keys duerfen in den deals-UPDATE.
describe("moveDealToStage — V8.15 SLC-913 MT-4 Mass-Assignment-Whitelist (ISSUE-115)", () => {
  it("Extra-Keys (owner_user_id/status/created_at/pipeline_id/value) werden NICHT geschrieben", async () => {
    const dealRow = { ...defaultDealRow(), won_lost_reason: null };
    const mock = makeSupabaseMock({ dealRow });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const maliciousPayload = {
      won_lost_reason: "Preis zu hoch",
      // alles ab hier sind Angriffs-Keys — "Verloren" erlaubt nur won_lost_reason:
      owner_user_id: "attacker-uuid",
      status: "won",
      created_at: "1999-01-01T00:00:00Z",
      pipeline_id: "pipeline-evil",
      value: 0,
      campaign_id: "campaign-evil",
    } as never;

    const result = await moveDealToStage(
      "deal-1",
      "stage-verloren",
      "Verloren",
      maliciousPayload
    );

    expect(result.error).toBe("");
    expect(mock.dealsUpdateCalls).toHaveLength(2);

    // Pflichtfeld-Update enthaelt NUR Whitelist-Feld + updated_at:
    const reqUpdate = mock.dealsUpdateCalls[0];
    expect(Object.keys(reqUpdate).sort()).toEqual(["updated_at", "won_lost_reason"]);
    expect(reqUpdate.owner_user_id).toBeUndefined();
    expect(reqUpdate.created_at).toBeUndefined();
    expect(reqUpdate.pipeline_id).toBeUndefined();
    expect(reqUpdate.campaign_id).toBeUndefined();
    expect(reqUpdate.value).toBeUndefined();
    // status wird NICHT vom Client-Input bestimmt — der Stage-Move setzt ihn regulaer:
    expect(mock.dealsUpdateCalls[1]).toMatchObject({ status: "lost" });
  });

  it("Nur Angriffs-Keys (kein Whitelist-Feld) -> Pflichtfeld-Phase entfaellt, regulaerer Stage-Move", async () => {
    const dealRow = { ...defaultDealRow(), won_lost_reason: "bereits gesetzt" };
    const mock = makeSupabaseMock({ dealRow });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await moveDealToStage(
      "deal-1",
      "stage-verloren",
      "Verloren",
      { owner_user_id: "attacker-uuid", created_at: "1999-01-01" } as never
    );

    expect(result.error).toBe("");
    // KEIN Pflichtfeld-Update — nur der Stage-Move selbst:
    expect(mock.dealsUpdateCalls).toHaveLength(1);
    expect(mock.dealsUpdateCalls[0]).toMatchObject({ stage_id: "stage-verloren" });
    expect(mock.dealsUpdateCalls[0].owner_user_id).toBeUndefined();
  });

  it("Nicht-skalare Werte (Objekt/Array) werden verworfen -> Pflichtfeld-Validation greift", async () => {
    const dealRow = { ...defaultDealRow(), value: null };
    const mock = makeSupabaseMock({ dealRow });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await moveDealToStage(
      "deal-1",
      "stage-gewonnen",
      "Gewonnen",
      { value: { evil: true } } as never
    );

    // Objekt-Wert verworfen -> value bleibt null -> Pflichtfeld fehlt:
    expect(result.error).toContain("Pflichtfelder");
    expect(mock.dealsUpdateCalls).toHaveLength(0);
  });

  it("Audit-Activity-Titel listet nur die Whitelist-Keys (keine Audit-Evasion)", async () => {
    const dealRow = { ...defaultDealRow(), value: null };
    const mock = makeSupabaseMock({ dealRow });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    await moveDealToStage(
      "deal-1",
      "stage-gewonnen",
      "Gewonnen",
      { value: 25000, owner_user_id: "attacker" } as never
    );

    const reqActivity = mock.activitiesInsertCalls[0];
    expect(reqActivity.title).toContain("value");
    expect(reqActivity.title).not.toContain("owner_user_id");
  });
});
