import { describe, it, expect } from "vitest";
import { formatAuditChanges } from "./format";

describe("formatAuditChanges", () => {
  it("returns empty array for null changes", () => {
    expect(formatAuditChanges(null)).toEqual([]);
  });

  it("returns empty array for empty changes object", () => {
    expect(formatAuditChanges({})).toEqual([]);
  });

  it("formats double-wrapped Workspace-update changes (ISSUE-050 repro)", () => {
    // Schema aus saveProposal-Workspace-Auto-Save: jedes Feld traegt ein
    // {before, after}-Objekt, gespiegelt in changes.before und changes.after.
    const result = formatAuditChanges(
      {
        before: { title: { before: "Old", after: "New" } },
        after: { title: { before: "Old", after: "New" } },
      },
      "update",
    );
    expect(result).toEqual([{ key: "title", display: "title: Old → New" }]);
  });

  it("formats double-wrapped multi-field update", () => {
    const inner = {
      title: { before: "Alt", after: "Neu" },
      tax_rate: { before: 19, after: 21 },
    };
    const result = formatAuditChanges(
      { before: inner, after: inner },
      "update",
    );
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.key)).toEqual(["title", "tax_rate"]);
    expect(result[0].display).toBe("title: Alt → Neu");
    expect(result[1].display).toBe("tax_rate: 19 → 21");
  });

  it("formats flat reverse_charge_toggled action (V5.7 pattern stays correct)", () => {
    const result = formatAuditChanges(
      {
        before: { reverse_charge: false, tax_rate: 21 },
        after: { reverse_charge: true, tax_rate: 0 },
      },
      "reverse_charge_toggled",
    );
    expect(result).toHaveLength(2);
    expect(result[0].display).toBe("reverse_charge: false → true");
    expect(result[1].display).toBe("tax_rate: 21 → 0");
  });

  it("formats flat status_change action (existing tax_rate: 9 → 0 still works)", () => {
    const result = formatAuditChanges(
      { before: { status: "draft" }, after: { status: "sent" } },
      "status_change",
    );
    expect(result).toEqual([
      { key: "status", display: "status: draft → sent" },
    ]);
  });

  it("skips unchanged fields in flat diff", () => {
    const result = formatAuditChanges(
      {
        before: { title: "Same", status: "draft" },
        after: { title: "Same", status: "sent" },
      },
      "update",
    );
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("status");
  });

  it("formats create action (only after)", () => {
    const result = formatAuditChanges(
      { after: { title: "Test", tax_rate: 19 } },
      "create",
    );
    expect(result).toHaveLength(2);
    expect(result[0].display).toBe("title: Test");
    expect(result[1].display).toBe("tax_rate: 19");
  });

  it("formats delete action (only before)", () => {
    const result = formatAuditChanges(
      { before: { title: "Soon-Gone", id: "abc" } },
      "delete",
    );
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.key)).toEqual(["title", "id"]);
  });

  it("renders null/undefined values as dash", () => {
    const result = formatAuditChanges({
      before: { skonto_percent: null },
      after: { skonto_percent: 2.0 },
    });
    expect(result[0].display).toBe("skonto_percent: - → 2");
  });

  it("renders deeply nested object value via JSON.stringify (defensive)", () => {
    // Falls jemand mal direkt ein Objekt unter changes.after schreibt (kein
    // double-wrap), soll mindestens lesbar gerendert werden statt [object Object].
    const result = formatAuditChanges({
      after: { meta: { foo: "bar" } },
    });
    expect(result[0].display).toBe(`meta: {"foo":"bar"}`);
  });

  it("handles double-wrapped with object values inside the diff", () => {
    // Edge: das innere before/after enthaelt selbst ein Objekt.
    const inner = {
      payment_terms: {
        before: { id: "a", days: 30 },
        after: { id: "b", days: 14 },
      },
    };
    const result = formatAuditChanges(
      { before: inner, after: inner },
      "update",
    );
    expect(result[0].display).toBe(
      `payment_terms: {"id":"a","days":30} → {"id":"b","days":14}`,
    );
  });
});
