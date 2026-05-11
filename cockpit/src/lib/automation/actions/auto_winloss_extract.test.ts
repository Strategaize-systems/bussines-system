// SLC-665 MT-6 — Auto Win/Loss Extract Action Tests
//
// Deckt:
//   - happy path won + lost (INSERT pending -> Bedrock -> UPDATE succeeded + audit_log)
//   - skip wenn deal.status weder won noch lost
//   - 5-Min-Time-Window-Throttle (audit "skipped:recent_run", kein neuer Run)
//   - Bedrock-Error -> UPDATE failed + error_message
//   - Idempotenz won -> lost -> won innerhalb 5 Min -> genau 2 Runs

import { describe, it, expect, vi } from "vitest";
import {
  executeAutoWinLossExtract,
  classifyTargetStatus,
} from "./auto_winloss_extract";
import type { ActionExecutionContext } from "./types";

interface FakeRun {
  id: string;
  deal_id: string;
  target_status: "won" | "lost";
  triggered_at: string;
  status: "pending" | "succeeded" | "failed";
  bedrock_output?: string | null;
  bedrock_model?: string | null;
  bedrock_completed_at?: string | null;
  error_message?: string | null;
}

interface FakeAudit {
  action: string;
  entity_id: string;
  context: string;
}

/**
 * Thenable Mock-Builder fuer Supabase-Postgrest-Style-Chains.
 * Unterstuetzt:  .from(t).select(...).eq(...).gte(...).order(...).limit(N).maybeSingle()
 *                .from(t).insert({...}).select(...).maybeSingle()
 *                .from(t).update({...}).eq(...)
 * Alle Pfade sind thenable damit `await supabase.from(t).update({...}).eq(...)` direkt aufloest.
 */
function buildFakeSupabase(initialRuns: FakeRun[] = []) {
  const runs: FakeRun[] = [...initialRuns];
  const audits: FakeAudit[] = [];

  type Op = "select" | "insert" | "update";

  function createChain(table: string) {
    const filters: Array<{ col: string; op: string; value: unknown }> = [];
    let insertPayload: Record<string, unknown> | null = null;
    let updatePayload: Record<string, unknown> | null = null;
    let orderBy: { col: string; ascending: boolean } | null = null;
    let limitVal: number | null = null;
    let op: Op = "select";

    function exec(single: boolean): { data: unknown; error: null } {
      if (table === "auto_winloss_runs") {
        if (op === "select") {
          let rows = runs.filter((r) => {
            for (const f of filters) {
              const v = (r as unknown as Record<string, unknown>)[f.col];
              if (f.op === "eq" && v !== f.value) return false;
              if (f.op === "gte" && String(v) < String(f.value)) return false;
            }
            return true;
          });
          if (orderBy) {
            rows = rows.slice().sort((a, b) => {
              const av = String(
                (a as unknown as Record<string, unknown>)[orderBy!.col]
              );
              const bv = String(
                (b as unknown as Record<string, unknown>)[orderBy!.col]
              );
              const cmp = av < bv ? -1 : av > bv ? 1 : 0;
              return orderBy!.ascending ? cmp : -cmp;
            });
          }
          if (limitVal !== null) rows = rows.slice(0, limitVal);
          return single
            ? { data: rows[0] ?? null, error: null }
            : { data: rows, error: null };
        }
        if (op === "insert") {
          const row: FakeRun = {
            id: `run-${runs.length + 1}`,
            deal_id: insertPayload!.deal_id as string,
            target_status: insertPayload!.target_status as "won" | "lost",
            triggered_at: insertPayload!.triggered_at as string,
            status: (insertPayload!.status as "pending") ?? "pending",
          };
          runs.push(row);
          return single
            ? { data: { id: row.id }, error: null }
            : { data: [{ id: row.id }], error: null };
        }
        if (op === "update") {
          const target = runs.find((r) => {
            for (const f of filters) {
              const v = (r as unknown as Record<string, unknown>)[f.col];
              if (f.op === "eq" && v !== f.value) return false;
            }
            return true;
          });
          if (target) Object.assign(target, updatePayload);
          return { data: null, error: null };
        }
      }
      if (table === "audit_log" && op === "insert") {
        audits.push({
          action: insertPayload!.action as string,
          entity_id: insertPayload!.entity_id as string,
          context: insertPayload!.context as string,
        });
        return { data: null, error: null };
      }
      return { data: null, error: null };
    }

    const api: Record<string, unknown> = {};
    api.select = () => api;
    api.eq = (col: string, value: unknown) => {
      filters.push({ col, op: "eq", value });
      return api;
    };
    api.gte = (col: string, value: unknown) => {
      filters.push({ col, op: "gte", value });
      return api;
    };
    api.order = (col: string, opts: { ascending: boolean }) => {
      orderBy = { col, ascending: opts.ascending };
      return api;
    };
    api.limit = (n: number) => {
      limitVal = n;
      return api;
    };
    api.maybeSingle = () => Promise.resolve(exec(true));
    api.single = () => Promise.resolve(exec(true));
    api.insert = (payload: Record<string, unknown>) => {
      op = "insert";
      insertPayload = payload;
      return api;
    };
    api.update = (payload: Record<string, unknown>) => {
      op = "update";
      updatePayload = payload;
      return api;
    };
    // Thenable — `await chain` resolves wie ein Postgrest-Result (Default
    // returns alle Rows). Wird vom Production-Code z.B. fuer
    // `await supabase.from(t).update({...}).eq(...)` benoetigt.
    api.then = (
      onFulfilled?: (value: { data: unknown; error: null }) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => {
      try {
        const v = exec(false);
        return Promise.resolve(onFulfilled ? onFulfilled(v) : v);
      } catch (e) {
        return Promise.resolve(onRejected ? onRejected(e) : e);
      }
    };

    return api;
  }

  const supabase = {
    from(table: string) {
      return createChain(table);
    },
  } as unknown as ActionExecutionContext["supabase"];

  return { supabase, runs, audits };
}

function buildContext(
  dealStatus: string | null,
  supabase: ActionExecutionContext["supabase"]
): ActionExecutionContext {
  return {
    supabase,
    rule: { id: "rule-sys", name: "[SYSTEM] Auto Win/Loss Extract" },
    entity: {
      type: "deal",
      id: "deal-1",
      data: { status: dealStatus, id: "deal-1" },
      contactId: null,
      companyId: null,
      dealId: "deal-1",
    },
    actionIndex: 0,
    triggerEventAuditId: "audit-1",
    triggerUserId: "user-1",
  };
}

describe("classifyTargetStatus", () => {
  it("returns won for status='won'", () => {
    expect(classifyTargetStatus({ status: "won" })).toBe("won");
  });
  it("returns lost for status='lost'", () => {
    expect(classifyTargetStatus({ status: "lost" })).toBe("lost");
  });
  it("returns null for any other status", () => {
    expect(classifyTargetStatus({ status: "active" })).toBeNull();
    expect(classifyTargetStatus({})).toBeNull();
    expect(classifyTargetStatus({ status: null })).toBeNull();
  });
});

describe("executeAutoWinLossExtract — happy paths", () => {
  it("creates a run + bedrock call + audit on won transition", async () => {
    const { supabase, runs, audits } = buildFakeSupabase();
    const runner = vi.fn().mockResolvedValue({
      markdown: "## Aktueller Stand\nGewonnen.",
      model: "claude-test",
      completedAt: "2026-05-11T12:00:00Z",
    });

    const result = await executeAutoWinLossExtract(
      buildContext("won", supabase),
      {},
      { runWinLossExtract: runner, now: () => new Date("2026-05-11T12:00:00Z") }
    );

    expect(result.outcome).toBe("success");
    expect(runner).toHaveBeenCalledOnce();
    expect(runs).toHaveLength(1);
    expect(runs[0].status).toBe("succeeded");
    expect(runs[0].bedrock_output).toContain("Gewonnen");
    expect(audits.some((a) => a.action === "auto_winloss_triggered")).toBe(
      true
    );
  });

  it("handles lost transition", async () => {
    const { supabase, runs } = buildFakeSupabase();
    const runner = vi.fn().mockResolvedValue({
      markdown: "Verloren.",
      model: "claude-test",
      completedAt: "2026-05-11T12:00:00Z",
    });

    const result = await executeAutoWinLossExtract(
      buildContext("lost", supabase),
      {},
      { runWinLossExtract: runner, now: () => new Date("2026-05-11T12:00:00Z") }
    );

    expect(result.outcome).toBe("success");
    expect(runs[0].target_status).toBe("lost");
  });
});

describe("executeAutoWinLossExtract — skips", () => {
  it("skips when deal.status is not won or lost", async () => {
    const { supabase, runs } = buildFakeSupabase();
    const runner = vi.fn();
    const result = await executeAutoWinLossExtract(
      buildContext("active", supabase),
      {},
      { runWinLossExtract: runner }
    );
    expect(result.outcome).toBe("skipped");
    expect(runner).not.toHaveBeenCalled();
    expect(runs).toHaveLength(0);
  });

  it("skips when a run for same target_status exists within 5 minutes", async () => {
    const recentRun: FakeRun = {
      id: "run-existing",
      deal_id: "deal-1",
      target_status: "won",
      triggered_at: "2026-05-11T12:00:00Z",
      status: "succeeded",
    };
    const { supabase, runs, audits } = buildFakeSupabase([recentRun]);
    const runner = vi.fn();

    const result = await executeAutoWinLossExtract(
      buildContext("won", supabase),
      {},
      {
        runWinLossExtract: runner,
        now: () => new Date("2026-05-11T12:03:00Z"), // 3 min later
      }
    );

    expect(result.outcome).toBe("skipped");
    expect(result.error_message).toBe("skipped:recent_run");
    expect(runner).not.toHaveBeenCalled();
    expect(runs).toHaveLength(1); // still only the original
    expect(
      audits.some((a) => a.action === "auto_winloss_skipped_recent_run")
    ).toBe(true);
  });

  it("triggers won -> lost -> won within 5 min => exactly 2 runs", async () => {
    const { supabase, runs } = buildFakeSupabase();
    const runner = vi.fn().mockResolvedValue({
      markdown: "x",
      model: "m",
      completedAt: "2026-05-11T12:01:00Z",
    });

    // 12:00 — won
    await executeAutoWinLossExtract(
      buildContext("won", supabase),
      {},
      { runWinLossExtract: runner, now: () => new Date("2026-05-11T12:00:00Z") }
    );
    // 12:01 — lost
    await executeAutoWinLossExtract(
      buildContext("lost", supabase),
      {},
      { runWinLossExtract: runner, now: () => new Date("2026-05-11T12:01:00Z") }
    );
    // 12:02 — won again (within 5 min => throttle)
    const third = await executeAutoWinLossExtract(
      buildContext("won", supabase),
      {},
      { runWinLossExtract: runner, now: () => new Date("2026-05-11T12:02:00Z") }
    );

    expect(third.outcome).toBe("skipped");
    expect(runs).toHaveLength(2);
    expect(runner).toHaveBeenCalledTimes(2);
  });
});

describe("executeAutoWinLossExtract — bedrock error", () => {
  it("marks run as failed when bedrock throws", async () => {
    const { supabase, runs } = buildFakeSupabase();
    const runner = vi.fn().mockRejectedValue(new Error("bedrock-down"));

    const result = await executeAutoWinLossExtract(
      buildContext("won", supabase),
      {},
      { runWinLossExtract: runner, now: () => new Date("2026-05-11T12:00:00Z") }
    );

    expect(result.outcome).toBe("failed");
    expect(result.error_message).toContain("bedrock");
    expect(runs[0].status).toBe("failed");
    expect(runs[0].error_message).toBe("bedrock-down");
  });
});
