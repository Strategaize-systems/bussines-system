// V8.7-B SLC-355 MT-2 — Win/Loss-Bucketing + Objektion-Notiz-Sammlung.
// Deckt AC-355-2 (Bucketing, k-min-Filter, keine PII-Identifier im Output).

import { afterEach, describe, expect, it, vi } from "vitest";

import { aggregateWinLoss } from "../aggregate-winloss";
import { gatherObjectionNotes } from "../gather-objections";

const NOW = new Date("2026-06-14T02:00:00Z");
const EXPECTED_CUTOFF = new Date(
  NOW.getTime() - 7 * 24 * 60 * 60 * 1000
).toISOString();

// ── Mock-Supabase im Stil von click-log-cleanup/route.test.ts ──────────────

interface WinLossQueryState {
  rows: Array<Record<string, unknown>> | null;
  error: { message: string } | null;
  capturedTable?: string;
  capturedSelect?: string;
  capturedEq?: [string, unknown];
  capturedGte?: [string, unknown];
}

function makeWinLossSupabase(state: WinLossQueryState) {
  return {
    from(table: string) {
      state.capturedTable = table;
      return {
        select(columns: string) {
          state.capturedSelect = columns;
          return {
            eq(col: string, val: unknown) {
              state.capturedEq = [col, val];
              return {
                gte(gcol: string, gval: unknown) {
                  state.capturedGte = [gcol, gval];
                  return Promise.resolve({
                    data: state.rows,
                    error: state.error,
                  });
                },
              };
            },
          };
        },
      };
    },
  };
}

interface ActivityQueryState {
  rows: Array<Record<string, unknown>> | null;
  error: { message: string } | null;
}

function makeActivitySupabase(state: ActivityQueryState) {
  return {
    from() {
      return {
        select() {
          return {
            not() {
              return {
                gte() {
                  return Promise.resolve({
                    data: state.rows,
                    error: state.error,
                  });
                },
              };
            },
          };
        },
      };
    },
  };
}

// Embedded-Join-Shape: auto_winloss_runs -> deals -> companies
function wlRow(
  targetStatus: "won" | "lost",
  industry: string | null,
  value: number | null,
  markdown: string
): Record<string, unknown> {
  return {
    target_status: targetStatus,
    bedrock_output: markdown,
    deals: {
      value,
      company_id: "c1",
      companies: industry === null ? null : { industry },
    },
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("aggregateWinLoss — AC-355-2", () => {
  it("queriet auto_winloss_runs status=succeeded mit 7d-Cutoff", async () => {
    const state: WinLossQueryState = { rows: [], error: null };
    const supabase = makeWinLossSupabase(state);

    await aggregateWinLoss(supabase, { now: NOW });

    expect(state.capturedTable).toBe("auto_winloss_runs");
    expect(state.capturedEq).toEqual(["status", "succeeded"]);
    expect(state.capturedGte?.[0]).toBe("created_at");
    expect(state.capturedGte?.[1]).toBe(EXPECTED_CUTOFF);
  });

  it("bucketet nach (Branche, Groesse, won/lost) und zaehlt Deals", async () => {
    const state: WinLossQueryState = {
      rows: [
        wlRow("won", "Beratung", 5000, "Win A"),
        wlRow("won", "Beratung", 8000, "Win B"),
        wlRow("lost", "Beratung", 60000, "Loss C"),
        wlRow("won", "IT", 30000, "Win D"),
      ],
      error: null,
    };
    const supabase = makeWinLossSupabase(state);

    const buckets = await aggregateWinLoss(supabase, { now: NOW, minBucket: 1 });

    // Beratung/small/won (2), Beratung/large/lost (1), IT/medium/won (1)
    expect(buckets).toHaveLength(3);
    const beratungSmallWon = buckets.find(
      (b) => b.branche === "Beratung" && b.sizeBucket === "small" && b.targetStatus === "won"
    );
    expect(beratungSmallWon?.dealCount).toBe(2);
    expect(beratungSmallWon?.runMarkdowns).toEqual(["Win A", "Win B"]);
  });

  it("mappt fehlende Branche/Wert auf 'unknown'", async () => {
    const state: WinLossQueryState = {
      rows: [wlRow("won", null, null, "Win X")],
      error: null,
    };
    const supabase = makeWinLossSupabase(state);

    const buckets = await aggregateWinLoss(supabase, { now: NOW, minBucket: 1 });
    expect(buckets).toHaveLength(1);
    expect(buckets[0].branche).toBe("unknown");
    expect(buckets[0].sizeBucket).toBe("unknown");
  });

  it("filtert Buckets unter minBucket (k-Anonymitaet, DEC-290)", async () => {
    const state: WinLossQueryState = {
      rows: [
        wlRow("won", "Beratung", 5000, "Win A"),
        wlRow("won", "Beratung", 8000, "Win B"),
        wlRow("won", "IT", 30000, "Win D"), // nur 1 -> bei minBucket 2 gefiltert
      ],
      error: null,
    };
    const supabase = makeWinLossSupabase(state);

    const buckets = await aggregateWinLoss(supabase, { now: NOW, minBucket: 2 });
    expect(buckets).toHaveLength(1);
    expect(buckets[0].branche).toBe("Beratung");
  });

  it("Default minBucket=1 => kein Skip (Founder-Direktive)", async () => {
    const state: WinLossQueryState = {
      rows: [wlRow("won", "IT", 30000, "Win D")],
      error: null,
    };
    const supabase = makeWinLossSupabase(state);

    const buckets = await aggregateWinLoss(supabase, { now: NOW });
    expect(buckets).toHaveLength(1);
  });

  it("ueberspringt Runs ohne bedrock_output", async () => {
    const state: WinLossQueryState = {
      rows: [
        { target_status: "won", bedrock_output: null, deals: { value: 5000, companies: { industry: "Beratung" } } },
      ],
      error: null,
    };
    const supabase = makeWinLossSupabase(state);

    const buckets = await aggregateWinLoss(supabase, { now: NOW });
    expect(buckets).toHaveLength(0);
  });

  it("wirft bei Query-Fehler", async () => {
    const state: WinLossQueryState = { rows: null, error: { message: "boom" } };
    const supabase = makeWinLossSupabase(state);

    await expect(aggregateWinLoss(supabase, { now: NOW })).rejects.toThrow(/boom/);
  });

  it("respektiert ENV-Groessen-Schwellen", async () => {
    vi.stubEnv("KNOWLEDGE_PUSH_SIZE_THRESHOLDS", "25000,100000");
    const state: WinLossQueryState = {
      rows: [wlRow("won", "IT", 30000, "Win D")], // 30k -> medium bei 25k/100k
      error: null,
    };
    const supabase = makeWinLossSupabase(state);

    const buckets = await aggregateWinLoss(supabase, { now: NOW });
    expect(buckets[0].sizeBucket).toBe("medium");
  });
});

describe("gatherObjectionNotes — AC-355-2/AC-355-3 input", () => {
  it("gruppiert Activity-Notizen nach Branche, k-min-gefiltert", async () => {
    const state: ActivityQueryState = {
      rows: [
        { description: "Kunde fand zu teuer", companies: { industry: "Beratung" } },
        { description: "Budget-Einwand", companies: { industry: "Beratung" } },
        { description: "kein Bedarf", companies: { industry: "IT" } },
      ],
      error: null,
    };
    const supabase = makeActivitySupabase(state);

    const groups = await gatherObjectionNotes(supabase, { now: NOW, minBucket: 2 });
    expect(groups).toHaveLength(1);
    expect(groups[0].branche).toBe("Beratung");
    expect(groups[0].noteCount).toBe(2);
    expect(groups[0].notes).toEqual(["Kunde fand zu teuer", "Budget-Einwand"]);
  });

  it("mappt fehlende Branche auf 'unknown' und deckelt Notizen pro Gruppe", async () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      description: `note ${i}`,
      companies: null,
    }));
    const state: ActivityQueryState = { rows, error: null };
    const supabase = makeActivitySupabase(state);

    const groups = await gatherObjectionNotes(supabase, {
      now: NOW,
      minBucket: 1,
      maxNotesPerGroup: 3,
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].branche).toBe("unknown");
    expect(groups[0].noteCount).toBe(5);
    expect(groups[0].notes).toHaveLength(3);
  });

  it("ueberspringt leere/whitespace-Notizen", async () => {
    const state: ActivityQueryState = {
      rows: [
        { description: "   ", companies: { industry: "IT" } },
        { description: "echter Einwand", companies: { industry: "IT" } },
      ],
      error: null,
    };
    const supabase = makeActivitySupabase(state);

    const groups = await gatherObjectionNotes(supabase, { now: NOW, minBucket: 1 });
    expect(groups).toHaveLength(1);
    expect(groups[0].noteCount).toBe(1);
  });

  it("wirft bei Query-Fehler", async () => {
    const state: ActivityQueryState = { rows: null, error: { message: "db down" } };
    const supabase = makeActivitySupabase(state);

    await expect(gatherObjectionNotes(supabase, { now: NOW })).rejects.toThrow(/db down/);
  });
});
