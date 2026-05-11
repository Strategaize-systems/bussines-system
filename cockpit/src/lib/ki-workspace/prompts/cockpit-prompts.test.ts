import { describe, it, expect } from "vitest";
import {
  buildPipelineSnapshotPrompt,
  buildTopChancenPrompt,
  buildConversionRatePrompt,
  buildForecastPrompt,
  buildWinLossAggregatePrompt,
  buildStagnierendeDealsPrompt,
  currentQuarterRange,
} from "./cockpit-prompts";
import type { CockpitContext, CockpitDeal } from "@/lib/ki-workspace/cockpit-context";

function makeDeal(overrides: Partial<CockpitDeal> = {}): CockpitDeal {
  return {
    id: "d1",
    title: "Deal",
    value: 1000,
    status: "active",
    pipeline_id: "p1",
    pipeline_name: "Multiplikatoren",
    stage_id: "s1",
    stage_name: "Identifiziert",
    probability: 50,
    company_name: "Acme GmbH",
    updated_at: "2026-05-11T00:00:00Z",
    last_activity_at: "2026-05-10T00:00:00Z",
    next_action: null,
    next_action_date: null,
    won_lost_reason: null,
    ...overrides,
  };
}

function makeCtx(overrides: Partial<CockpitContext> = {}): CockpitContext {
  return {
    generatedAt: "2026-05-11T12:00:00Z",
    pipelines: [
      { id: "p1", name: "Multiplikatoren" },
      { id: "p2", name: "Unternehmer-Chancen" },
    ],
    deals: [],
    ...overrides,
  };
}

describe("buildPipelineSnapshotPrompt", () => {
  it("aggregates deals per pipeline and stage with EUR sum", () => {
    const ctx = makeCtx({
      deals: [
        makeDeal({ id: "d1", value: 1000, pipeline_id: "p1", stage_id: "s1" }),
        makeDeal({ id: "d2", value: 2000, pipeline_id: "p1", stage_id: "s1" }),
        makeDeal({
          id: "d3",
          value: 5000,
          pipeline_id: "p2",
          pipeline_name: "Unternehmer-Chancen",
          stage_id: "s2",
          stage_name: "Verhandlung",
        }),
      ],
    });
    const result = buildPipelineSnapshotPrompt(ctx);
    expect(result).toContain("Multiplikatoren");
    expect(result).toContain("Identifiziert: 2 Deals");
    expect(result).toMatch(/3\.000/);
    expect(result).toContain("Unternehmer-Chancen");
    expect(result).toContain("Verhandlung: 1 Deals");
    expect(result).toMatch(/5\.000/);
  });

  it("excludes won/lost deals", () => {
    const ctx = makeCtx({
      deals: [
        makeDeal({ id: "active", status: "active", value: 100 }),
        makeDeal({ id: "won", status: "won", value: 99999 }),
        makeDeal({ id: "lost", status: "lost", value: 88888 }),
      ],
    });
    const result = buildPipelineSnapshotPrompt(ctx);
    expect(result).toContain("Aktive Deals gesamt: 1");
    expect(result).not.toMatch(/99\.999/);
    expect(result).not.toMatch(/88\.888/);
  });
});

describe("buildTopChancenPrompt", () => {
  it("emits == PIPELINE markers per pipeline (parsed by AnswerPane tab-renderer)", () => {
    const ctx = makeCtx({
      deals: [
        makeDeal({ id: "d1", pipeline_id: "p1" }),
        makeDeal({
          id: "d2",
          pipeline_id: "p2",
          pipeline_name: "Unternehmer-Chancen",
        }),
      ],
    });
    const result = buildTopChancenPrompt(ctx);
    expect(result).toContain("=== PIPELINE: Multiplikatoren ===");
    expect(result).toContain("=== PIPELINE: Unternehmer-Chancen ===");
  });

  it("sorts within pipeline by value*probability DESC and limits to top-10", () => {
    const ctx = makeCtx({
      deals: Array.from({ length: 15 }, (_, i) =>
        makeDeal({
          id: `d${i}`,
          pipeline_id: "p1",
          title: `T${i}`,
          value: 1000 * (i + 1),
          probability: 50,
        }),
      ),
    });
    const result = buildTopChancenPrompt(ctx);
    expect(result).toContain("T14");
    expect(result).toContain("T5");
    expect(result).not.toContain("T4 ");
    expect(result).not.toContain("T0 ");
  });

  it("renders 'Keine aktiven Deals' when pipeline is empty", () => {
    const ctx = makeCtx({ deals: [] });
    const result = buildTopChancenPrompt(ctx);
    expect(result).toContain("Keine aktiven Deals in dieser Pipeline.");
  });
});

describe("buildConversionRatePrompt", () => {
  it("counts won/lost and lists top loss reasons", () => {
    const ctx = makeCtx({
      deals: [
        makeDeal({ id: "w1", status: "won", value: 5000 }),
        makeDeal({ id: "w2", status: "won", value: 3000 }),
        makeDeal({
          id: "l1",
          status: "lost",
          value: 1000,
          won_lost_reason: "Preis zu hoch",
        }),
        makeDeal({
          id: "l2",
          status: "lost",
          value: 2000,
          won_lost_reason: "Preis zu hoch",
        }),
        makeDeal({
          id: "l3",
          status: "lost",
          value: 4000,
          won_lost_reason: "Kein Bedarf",
        }),
      ],
    });
    const result = buildConversionRatePrompt(ctx);
    expect(result).toContain("Gewonnen: 2 Deals");
    expect(result).toContain("Verloren: 3 Deals");
    expect(result).toContain("Preis zu hoch (2x)");
    expect(result).toContain("Kein Bedarf (1x)");
  });
});

describe("currentQuarterRange", () => {
  it("returns Q2 range for May 2026", () => {
    const now = new Date(2026, 4, 11); // 11 May 2026 (month index 4)
    const q = currentQuarterRange(now);
    expect(q.label).toBe("Q2 2026");
    expect(q.start.getMonth()).toBe(3); // April
    expect(q.end.getMonth()).toBe(5); // June
  });

  it("returns Q1 range for January", () => {
    const q = currentQuarterRange(new Date(2026, 0, 15));
    expect(q.label).toBe("Q1 2026");
  });

  it("returns Q4 range for December", () => {
    const q = currentQuarterRange(new Date(2026, 11, 15));
    expect(q.label).toBe("Q4 2026");
  });
});

describe("buildForecastPrompt", () => {
  it("sums weighted value = sum(value*probability/100) for deals in quarter", () => {
    const ctx = makeCtx({
      deals: [
        makeDeal({
          id: "d1",
          value: 1000,
          probability: 50,
          next_action_date: "2026-05-15",
          pipeline_id: "p1",
        }),
        makeDeal({
          id: "d2",
          value: 2000,
          probability: 75,
          next_action_date: "2026-05-20",
          pipeline_id: "p1",
        }),
      ],
    });
    const result = buildForecastPrompt({
      ctx,
      quarterStart: new Date(2026, 3, 1),
      quarterEnd: new Date(2026, 5, 30, 23, 59),
      quarterLabel: "Q2 2026",
    });
    // 1000*0.5 + 2000*0.75 = 500 + 1500 = 2000
    expect(result).toContain("Q2 2026");
    expect(result).toMatch(/2\.000/);
    expect(result).toContain("Aktive Deals im Fenster: 2");
  });

  it("excludes deals outside quarter", () => {
    const ctx = makeCtx({
      deals: [
        makeDeal({
          id: "out",
          value: 9999,
          probability: 100,
          next_action_date: "2026-12-30",
          pipeline_id: "p1",
        }),
      ],
    });
    const result = buildForecastPrompt({
      ctx,
      quarterStart: new Date(2026, 3, 1),
      quarterEnd: new Date(2026, 5, 30, 23, 59),
      quarterLabel: "Q2 2026",
    });
    expect(result).toContain("Aktive Deals im Fenster: 0");
  });
});

describe("buildWinLossAggregatePrompt", () => {
  it("lists won and lost deals with reasons", () => {
    const ctx = makeCtx({
      deals: [
        makeDeal({ id: "w", status: "won", title: "Won-A", value: 5000 }),
        makeDeal({
          id: "l",
          status: "lost",
          title: "Lost-B",
          value: 3000,
          won_lost_reason: "Preis",
        }),
      ],
    });
    const result = buildWinLossAggregatePrompt(ctx);
    expect(result).toContain("Gewonnen: 1");
    expect(result).toContain("Verloren: 1");
    expect(result).toContain("Won-A");
    expect(result).toContain("Lost-B");
    expect(result).toContain("Grund: Preis");
  });

  it("excludes active deals", () => {
    const ctx = makeCtx({
      deals: [makeDeal({ id: "a", status: "active", title: "Active-X" })],
    });
    const result = buildWinLossAggregatePrompt(ctx);
    expect(result).toContain("Gewonnen: 0");
    expect(result).toContain("Verloren: 0");
    expect(result).not.toContain("Active-X");
  });
});

describe("buildStagnierendeDealsPrompt", () => {
  const NOW = new Date("2026-05-11T12:00:00Z");

  it("filters deals stagnant >= threshold days based on last_activity_at", () => {
    const ctx = makeCtx({
      deals: [
        makeDeal({
          id: "old",
          title: "Old",
          last_activity_at: "2026-04-01T00:00:00Z", // ~40 Tage idle
        }),
        makeDeal({
          id: "recent",
          title: "Recent",
          last_activity_at: "2026-05-09T00:00:00Z", // 2 Tage idle
        }),
      ],
    });
    const result = buildStagnierendeDealsPrompt({
      ctx,
      thresholdDays: 14,
      now: NOW,
    });
    expect(result).toContain("Stagnierende Deals: 1");
    expect(result).toContain("Old");
    expect(result).not.toContain("- Recent");
  });

  it("uses updated_at when last_activity_at is null", () => {
    const ctx = makeCtx({
      deals: [
        makeDeal({
          id: "fallback",
          title: "Fallback",
          last_activity_at: null,
          updated_at: "2026-04-01T00:00:00Z",
        }),
      ],
    });
    const result = buildStagnierendeDealsPrompt({
      ctx,
      thresholdDays: 14,
      now: NOW,
    });
    expect(result).toContain("Fallback");
  });

  it("returns empty marker when nothing is stagnant", () => {
    const ctx = makeCtx({
      deals: [makeDeal({ id: "fresh", last_activity_at: "2026-05-11T00:00:00Z" })],
    });
    const result = buildStagnierendeDealsPrompt({
      ctx,
      thresholdDays: 14,
      now: NOW,
    });
    expect(result).toContain("Keine stagnierenden Deals");
  });

  it("excludes won/lost deals from stagnation list", () => {
    const ctx = makeCtx({
      deals: [
        makeDeal({
          id: "wonOld",
          status: "won",
          title: "WonOld",
          last_activity_at: "2026-01-01T00:00:00Z",
        }),
      ],
    });
    const result = buildStagnierendeDealsPrompt({
      ctx,
      thresholdDays: 14,
      now: NOW,
    });
    expect(result).not.toContain("WonOld");
  });
});
