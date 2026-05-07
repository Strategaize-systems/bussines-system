// =============================================================
// runClickLogCleanup — Pure-Function-Test
// SLC-641 / FEAT-641 — V6.4 Hygiene-Sprint (BL-423)
// =============================================================
//
// Deckt:
// - Cutoff-Berechnung exakt 90 Tage zurueck (UTC)
// - DELETE wird mit count:"exact" und .lt("clicked_at", cutoff) aufgerufen
// - audit_log-Insert mit korrekten changes-Feldern
// - 0-Row-Fall liefert success:true, deleted:0, oldest_kept:null
// - Error-Pfad: DELETE-Fehler propagiert als Throw
// - Error-Pfad: audit_log-Insert-Fehler propagiert als Throw

import { describe, expect, it } from "vitest";
import { runClickLogCleanup } from "./route";

interface DeleteCall {
  table: string;
  options: unknown;
  ltColumn: string;
  ltValue: string;
}

interface SelectCall {
  table: string;
  columns: string;
  orderColumn: string;
  orderOpts: unknown;
  limit: number;
}

interface InsertCall {
  table: string;
  row: Record<string, unknown>;
}

interface MockState {
  deleteCalls: DeleteCall[];
  selectCalls: SelectCall[];
  insertCalls: InsertCall[];
  deleteError: { message: string } | null;
  deleteCount: number | null;
  selectData: Array<Record<string, unknown>> | null;
  selectError: { message: string } | null;
  insertError: { message: string } | null;
}

function makeMockSupabase(state: MockState) {
  return {
    from(table: string) {
      return {
        delete(options?: { count?: "exact" | "planned" | "estimated" }) {
          return {
            lt(column: string, value: string) {
              state.deleteCalls.push({
                table,
                options,
                ltColumn: column,
                ltValue: value,
              });
              return Promise.resolve({
                data: null,
                error: state.deleteError,
                count: state.deleteCount,
              });
            },
          };
        },
        select(columns: string) {
          return {
            order(orderColumn: string, orderOpts: { ascending: boolean }) {
              return {
                limit(n: number) {
                  state.selectCalls.push({
                    table,
                    columns,
                    orderColumn,
                    orderOpts,
                    limit: n,
                  });
                  return Promise.resolve({
                    data: state.selectData,
                    error: state.selectError,
                  });
                },
              };
            },
          };
        },
        insert(row: Record<string, unknown>) {
          state.insertCalls.push({ table, row });
          return Promise.resolve({ error: state.insertError });
        },
      };
    },
  };
}

function makeState(overrides: Partial<MockState> = {}): MockState {
  return {
    deleteCalls: [],
    selectCalls: [],
    insertCalls: [],
    deleteError: null,
    deleteCount: 0,
    selectData: [],
    selectError: null,
    insertError: null,
    ...overrides,
  };
}

const NOW = new Date("2026-05-07T03:00:00Z");
const EXPECTED_CUTOFF = new Date(
  NOW.getTime() - 90 * 24 * 60 * 60 * 1000,
).toISOString();

describe("runClickLogCleanup — Cutoff + DELETE", () => {
  it("berechnet Cutoff exakt 90 Tage vor now (UTC)", async () => {
    const state = makeState({ deleteCount: 5 });
    const supabase = makeMockSupabase(state);

    const result = await runClickLogCleanup(supabase, NOW);

    expect(result.cutoff).toBe(EXPECTED_CUTOFF);
    expect(result.cutoff).toBe("2026-02-06T03:00:00.000Z");
  });

  it("ruft DELETE auf campaign_link_clicks mit count:'exact' und .lt('clicked_at', cutoff) auf", async () => {
    const state = makeState({ deleteCount: 3 });
    const supabase = makeMockSupabase(state);

    await runClickLogCleanup(supabase, NOW);

    expect(state.deleteCalls).toHaveLength(1);
    expect(state.deleteCalls[0].table).toBe("campaign_link_clicks");
    expect(state.deleteCalls[0].options).toEqual({ count: "exact" });
    expect(state.deleteCalls[0].ltColumn).toBe("clicked_at");
    expect(state.deleteCalls[0].ltValue).toBe(EXPECTED_CUTOFF);
  });
});

describe("runClickLogCleanup — Audit-Log-Insert", () => {
  it("insertet audit_log-Zeile mit action, entity_type, changes und context", async () => {
    const state = makeState({
      deleteCount: 7,
      selectData: [{ clicked_at: "2026-02-08T12:00:00Z" }],
    });
    const supabase = makeMockSupabase(state);

    await runClickLogCleanup(supabase, NOW);

    expect(state.insertCalls).toHaveLength(1);
    expect(state.insertCalls[0].table).toBe("audit_log");
    expect(state.insertCalls[0].row.action).toBe("click_log_cleanup");
    expect(state.insertCalls[0].row.entity_type).toBe("campaign_link_clicks");
    expect(state.insertCalls[0].row.entity_id).toBeNull();
    expect(state.insertCalls[0].row.actor_id).toBeNull();

    const changes = state.insertCalls[0].row.changes as Record<string, unknown>;
    expect(changes.deleted_count).toBe(7);
    expect(changes.oldest_kept).toBe("2026-02-08T12:00:00Z");
    expect(changes.cutoff).toBe(EXPECTED_CUTOFF);
    expect(changes.run_at).toBe(NOW.toISOString());

    expect(typeof state.insertCalls[0].row.context).toBe("string");
    expect(state.insertCalls[0].row.context).toContain("DSGVO");
    expect(state.insertCalls[0].row.context).toContain("7");
  });
});

describe("runClickLogCleanup — 0-Row-Fall (Idempotenz)", () => {
  it("liefert success:true, deleted:0, oldest_kept:null wenn nichts zu loeschen ist und Tabelle leer", async () => {
    const state = makeState({
      deleteCount: 0,
      selectData: [],
    });
    const supabase = makeMockSupabase(state);

    const result = await runClickLogCleanup(supabase, NOW);

    expect(result.success).toBe(true);
    expect(result.deleted).toBe(0);
    expect(result.oldest_kept).toBeNull();
    expect(result.cutoff).toBe(EXPECTED_CUTOFF);
    expect(result.run_at).toBe(NOW.toISOString());

    // 0-Row-Lauf schreibt trotzdem audit_log (Spur fuer Cron-Run-Aktivitaet).
    expect(state.insertCalls).toHaveLength(1);
    const changes = state.insertCalls[0].row.changes as Record<string, unknown>;
    expect(changes.deleted_count).toBe(0);
    expect(changes.oldest_kept).toBeNull();
  });

  it("behandelt count:null als deleted:0 (supabase-js Edge-Case)", async () => {
    const state = makeState({ deleteCount: null });
    const supabase = makeMockSupabase(state);

    const result = await runClickLogCleanup(supabase, NOW);

    expect(result.deleted).toBe(0);
  });
});

describe("runClickLogCleanup — Error-Pfade", () => {
  it("wirft Error wenn DELETE fehlschlaegt", async () => {
    const state = makeState({
      deleteError: { message: "permission denied" },
    });
    const supabase = makeMockSupabase(state);

    await expect(runClickLogCleanup(supabase, NOW)).rejects.toThrow(
      /DELETE failed.*permission denied/,
    );
    expect(state.insertCalls).toHaveLength(0);
  });

  it("wirft Error wenn MIN(clicked_at)-SELECT fehlschlaegt", async () => {
    const state = makeState({
      deleteCount: 2,
      selectError: { message: "connection lost" },
    });
    const supabase = makeMockSupabase(state);

    await expect(runClickLogCleanup(supabase, NOW)).rejects.toThrow(
      /MIN.*connection lost/,
    );
    expect(state.insertCalls).toHaveLength(0);
  });

  it("wirft Error wenn audit_log-Insert fehlschlaegt", async () => {
    const state = makeState({
      deleteCount: 1,
      insertError: { message: "audit_log table missing" },
    });
    const supabase = makeMockSupabase(state);

    await expect(runClickLogCleanup(supabase, NOW)).rejects.toThrow(
      /audit_log insert failed.*table missing/,
    );
  });
});
