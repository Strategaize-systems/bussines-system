import { describe, it, expect } from "vitest";
import {
  mapRawDealToCard,
  sortDealsByWeightedValue,
  selectTopActiveDeals,
  type DealCardData,
} from "./queries";

const baseRaw = {
  id: "d1",
  title: "Deal 1",
  value: 1000,
  status: "active",
  pipeline_id: "p1",
  stage_id: "s1",
  next_action: null,
  next_action_date: null,
  updated_at: "2026-05-01T00:00:00Z",
};

describe("mapRawDealToCard", () => {
  it("flattens companies array and pipeline_stages array", () => {
    const card = mapRawDealToCard({
      ...baseRaw,
      companies: [{ name: "Acme GmbH" }],
      pipeline_stages: [{ name: "Verhandlung", color: "#ff0000", probability: 50 }],
    });
    expect(card.company_name).toBe("Acme GmbH");
    expect(card.stage_name).toBe("Verhandlung");
    expect(card.stage_color).toBe("#ff0000");
    expect(card.probability).toBe(50);
    expect(card.weighted_value).toBe(50_000);
  });

  it("flattens companies object and pipeline_stages object", () => {
    const card = mapRawDealToCard({
      ...baseRaw,
      companies: { name: "Acme GmbH" },
      pipeline_stages: { name: "Verhandlung", color: null, probability: 30 },
    });
    expect(card.company_name).toBe("Acme GmbH");
    expect(card.probability).toBe(30);
    expect(card.weighted_value).toBe(30_000);
  });

  it("handles null companies and null pipeline_stages with weighted_value=0", () => {
    const card = mapRawDealToCard({
      ...baseRaw,
      companies: null,
      pipeline_stages: null,
    });
    expect(card.company_name).toBeNull();
    expect(card.probability).toBe(0);
    expect(card.weighted_value).toBe(0);
  });

  it("treats null value as 0 in weighted_value", () => {
    const card = mapRawDealToCard({
      ...baseRaw,
      value: null,
      companies: null,
      pipeline_stages: { name: "S", color: null, probability: 80 },
    });
    expect(card.value).toBeNull();
    expect(card.weighted_value).toBe(0);
  });
});

function makeCard(overrides: Partial<DealCardData> = {}): DealCardData {
  return {
    id: "x",
    title: "x",
    value: 0,
    status: "active",
    pipeline_id: "p1",
    stage_id: null,
    stage_name: null,
    stage_color: null,
    probability: 0,
    company_name: null,
    next_action_title: null,
    next_action_date: null,
    weighted_value: 0,
    updated_at: "2026-05-01T00:00:00Z",
    ...overrides,
  };
}

describe("sortDealsByWeightedValue", () => {
  it("sorts descending by weighted_value", () => {
    const a = makeCard({ id: "low", weighted_value: 100 });
    const b = makeCard({ id: "high", weighted_value: 1000 });
    const c = makeCard({ id: "mid", weighted_value: 500 });
    const sorted = sortDealsByWeightedValue([a, b, c]);
    expect(sorted.map((d) => d.id)).toEqual(["high", "mid", "low"]);
  });

  it("does not mutate input array", () => {
    const a = makeCard({ id: "a", weighted_value: 1 });
    const b = makeCard({ id: "b", weighted_value: 2 });
    const input = [a, b];
    sortDealsByWeightedValue(input);
    expect(input.map((d) => d.id)).toEqual(["a", "b"]);
  });
});

describe("selectTopActiveDeals", () => {
  it("excludes won/lost/parked status", () => {
    const cards = [
      makeCard({ id: "active1", status: "active", weighted_value: 10 }),
      makeCard({ id: "won1", status: "won", weighted_value: 100 }),
      makeCard({ id: "lost1", status: "lost", weighted_value: 50 }),
      makeCard({ id: "parked1", status: "parked", weighted_value: 30 }),
      makeCard({ id: "active2", status: "active", weighted_value: 5 }),
    ];
    const result = selectTopActiveDeals(cards, 10);
    expect(result.map((d) => d.id)).toEqual(["active1", "active2"]);
  });

  it("limits to top-N", () => {
    const cards = Array.from({ length: 15 }, (_, i) =>
      makeCard({ id: `d${i}`, weighted_value: i }),
    );
    const result = selectTopActiveDeals(cards, 10);
    expect(result).toHaveLength(10);
    expect(result[0].id).toBe("d14");
    expect(result[9].id).toBe("d5");
  });

  it("returns empty array for empty input", () => {
    expect(selectTopActiveDeals([], 10)).toEqual([]);
  });
});
