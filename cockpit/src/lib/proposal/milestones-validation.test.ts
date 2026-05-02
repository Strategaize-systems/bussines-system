import { describe, it, expect } from "vitest";
import {
  validateMilestonesSum,
  validateMilestoneTrigger,
  type MilestoneInput,
} from "./milestones-validation";

function m(
  partial: Partial<MilestoneInput> & { sequence: number; percent: number },
): MilestoneInput {
  return {
    due_trigger: "on_signature",
    due_offset_days: null,
    label: null,
    ...partial,
  };
}

describe("validateMilestonesSum", () => {
  it("akzeptiert empty array (Off-State)", () => {
    expect(validateMilestonesSum([])).toEqual({ ok: true });
  });

  it("akzeptiert Single 100", () => {
    expect(
      validateMilestonesSum([m({ sequence: 1, percent: 100 })]),
    ).toEqual({ ok: true });
  });

  it("akzeptiert 50/50 Split", () => {
    expect(
      validateMilestonesSum([
        m({ sequence: 1, percent: 50 }),
        m({ sequence: 2, percent: 50 }),
      ]),
    ).toEqual({ ok: true });
  });

  it("akzeptiert 33.33+33.33+33.34=100.00", () => {
    expect(
      validateMilestonesSum([
        m({ sequence: 1, percent: 33.33 }),
        m({ sequence: 2, percent: 33.33 }),
        m({ sequence: 3, percent: 33.34 }),
      ]),
    ).toEqual({ ok: true });
  });

  it("blockt 33+33+33=99", () => {
    const r = validateMilestonesSum([
      m({ sequence: 1, percent: 33 }),
      m({ sequence: 2, percent: 33 }),
      m({ sequence: 3, percent: 33 }),
    ]);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/fehlt 1\.00/);
  });

  it("blockt 50+50+50=150", () => {
    const r = validateMilestonesSum([
      m({ sequence: 1, percent: 50 }),
      m({ sequence: 2, percent: 50 }),
      m({ sequence: 3, percent: 50 }),
    ]);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/ueberschreitet um 50\.00/);
  });

  it("blockt 99.999 nicht (rundet auf 100.00)", () => {
    expect(
      validateMilestonesSum([
        m({ sequence: 1, percent: 49.9995 }),
        m({ sequence: 2, percent: 50.0005 }),
      ]),
    ).toEqual({ ok: true });
  });

  it("blockt Luecke in Sequenzen (1, 3)", () => {
    const r = validateMilestonesSum([
      m({ sequence: 1, percent: 50 }),
      m({ sequence: 3, percent: 50 }),
    ]);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/Sequenzen/);
  });

  it("blockt Sequenz-Start bei 0", () => {
    const r = validateMilestonesSum([
      m({ sequence: 0, percent: 50 }),
      m({ sequence: 1, percent: 50 }),
    ]);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/1-based/);
  });

  it("blockt Duplicates in Sequenzen (1, 1)", () => {
    const r = validateMilestonesSum([
      m({ sequence: 1, percent: 50 }),
      m({ sequence: 1, percent: 50 }),
    ]);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/Sequenzen/);
  });
});

describe("validateMilestoneTrigger", () => {
  it("akzeptiert on_signature ohne Tage", () => {
    expect(
      validateMilestoneTrigger(
        m({ sequence: 1, percent: 50, due_trigger: "on_signature" }),
      ),
    ).toEqual({ ok: true });
  });

  it("akzeptiert on_completion ohne Tage", () => {
    expect(
      validateMilestoneTrigger(
        m({ sequence: 1, percent: 50, due_trigger: "on_completion" }),
      ),
    ).toEqual({ ok: true });
  });

  it("akzeptiert on_milestone ohne Tage", () => {
    expect(
      validateMilestoneTrigger(
        m({
          sequence: 1,
          percent: 50,
          due_trigger: "on_milestone",
          label: "Kickoff",
        }),
      ),
    ).toEqual({ ok: true });
  });

  it("akzeptiert days_after_signature mit gueltigen Tagen", () => {
    expect(
      validateMilestoneTrigger(
        m({
          sequence: 1,
          percent: 50,
          due_trigger: "days_after_signature",
          due_offset_days: 30,
        }),
      ),
    ).toEqual({ ok: true });
  });

  it("blockt days_after_signature ohne Tage", () => {
    const r = validateMilestoneTrigger(
      m({
        sequence: 1,
        percent: 50,
        due_trigger: "days_after_signature",
        due_offset_days: null,
      }),
    );
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/Tage-Offset/);
  });

  it("blockt days_after_signature mit 0 Tagen", () => {
    const r = validateMilestoneTrigger(
      m({
        sequence: 1,
        percent: 50,
        due_trigger: "days_after_signature",
        due_offset_days: 0,
      }),
    );
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/Tage-Offset/);
  });

  it("blockt days_after_signature mit negativen Tagen", () => {
    const r = validateMilestoneTrigger(
      m({
        sequence: 1,
        percent: 50,
        due_trigger: "days_after_signature",
        due_offset_days: -1,
      }),
    );
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/Tage-Offset/);
  });

  it("blockt days_after_signature mit Float-Tagen", () => {
    const r = validateMilestoneTrigger(
      m({
        sequence: 1,
        percent: 50,
        due_trigger: "days_after_signature",
        due_offset_days: 30.5,
      }),
    );
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/Tage-Offset/);
  });

  it("blockt on_signature mit gesetzten Tagen", () => {
    const r = validateMilestoneTrigger(
      m({
        sequence: 1,
        percent: 50,
        due_trigger: "on_signature",
        due_offset_days: 30,
      }),
    );
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/days_after_signature/);
  });

  it("blockt invalid Trigger", () => {
    const r = validateMilestoneTrigger(
      m({
        sequence: 1,
        percent: 50,
        // @ts-expect-error - testing invalid input
        due_trigger: "after_xmas",
      }),
    );
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/Ungueltiger Trigger/);
  });

  it("blockt Prozent = 0", () => {
    const r = validateMilestoneTrigger(
      m({ sequence: 1, percent: 0, due_trigger: "on_signature" }),
    );
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/Prozent/);
  });

  it("blockt Prozent > 100", () => {
    const r = validateMilestoneTrigger(
      m({ sequence: 1, percent: 101, due_trigger: "on_signature" }),
    );
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/Prozent/);
  });
});
