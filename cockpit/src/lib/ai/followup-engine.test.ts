// =============================================================
// findFollowupCandidates — Open-Proposals-Query Regression-Test
// SLC-641 / FEAT-641 — V6.4 ISSUE-057 (proposals.value -> total_gross)
// =============================================================
//
// Pure-Function-Test mit Mock-Supabase-Client. Prueft, dass die
// Open-Proposals-Query (Z. 193-208 in followup-engine.ts) auf
// `total_gross` selektiert und ordert — nicht mehr auf `value`.
// Schlaegt fehl, wenn ISSUE-057 regressiert.

import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------
// Captured state per query-chain (one chain per `from(table)` call)
// ---------------------------------------------------------------

interface ProposalsCapture {
  selectArg: string | null;
  orderColumn: string | null;
  orderOpts: unknown;
}

const proposalsCapture: ProposalsCapture = {
  selectArg: null,
  orderColumn: null,
  orderOpts: null,
};

function resetCapture() {
  proposalsCapture.selectArg = null;
  proposalsCapture.orderColumn = null;
  proposalsCapture.orderOpts = null;
}

function makeQueryBuilder(table: string) {
  const builder: Record<string, unknown> = {};

  builder.select = (col: string) => {
    if (table === "proposals") proposalsCapture.selectArg = col;
    return builder;
  };
  builder.eq = () => builder;
  builder.lt = () => builder;
  builder.in = () => builder;
  builder.order = (col: string, opts?: unknown) => {
    if (table === "proposals") {
      proposalsCapture.orderColumn = col;
      proposalsCapture.orderOpts = opts;
    }
    return builder;
  };
  builder.limit = async () => ({ data: [], error: null });

  return builder;
}

// ---------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => makeQueryBuilder(table),
  }),
}));

vi.mock("./bedrock-client", () => ({
  queryLLM: vi.fn(),
}));

vi.mock("./parser", () => ({
  parseLLMResponse: vi.fn(),
}));

vi.mock("./action-queue", () => ({
  createAction: vi.fn(),
}));

vi.mock("./prompts/followup-suggest", () => ({
  getFollowupSuggestSystemPrompt: () => "system",
  buildFollowupSuggestPrompt: () => "prompt",
}));

// ---------------------------------------------------------------
// Tests
// ---------------------------------------------------------------

describe("findFollowupCandidates — Open-Proposals-Query (ISSUE-057)", () => {
  beforeEach(() => {
    resetCapture();
  });

  it("selektiert die Spalte total_gross (nicht value)", async () => {
    const { findFollowupCandidates } = await import("./followup-engine");
    await findFollowupCandidates();

    expect(proposalsCapture.selectArg).not.toBeNull();
    expect(proposalsCapture.selectArg).toContain("total_gross");
    // value darf nirgendwo als eigenes Feld im proposals-Select stehen.
    // Match nur, wenn `value` zwischen Whitespace/Komma/Newlines steht.
    expect(proposalsCapture.selectArg).not.toMatch(
      /(^|[\s,])value(\s*,|\s*$)/m,
    );
  });

  it("ordert nach total_gross (nicht value) absteigend", async () => {
    const { findFollowupCandidates } = await import("./followup-engine");
    await findFollowupCandidates();

    expect(proposalsCapture.orderColumn).toBe("total_gross");
    expect(proposalsCapture.orderOpts).toEqual({
      ascending: false,
      nullsFirst: false,
    });
  });
});
