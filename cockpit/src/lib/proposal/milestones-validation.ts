// V5.6 SLC-563 — Pure Validation fuer Payment-Milestones (Split-Plan).
// Single-Source-of-Truth: wird im UI (live error) und in der Server Action
// (defense-in-depth gegen Bypass) gleichermassen genutzt.
// DEC-115 strict 100% sum — kein Toleranz-Bereich, User korrigiert bewusst.

import type {
  PaymentMilestone,
  PaymentMilestoneTrigger,
} from "@/types/proposal-payment";

export type MilestonesValidationResult =
  | { ok: true }
  | { ok: false; error: string };

const VALID_TRIGGERS: ReadonlyArray<PaymentMilestoneTrigger> = [
  "on_signature",
  "on_completion",
  "days_after_signature",
  "on_milestone",
];

// Input-Shape fuer Validation. PaymentMilestone-Felder die NICHT vom UI kommen
// (id, proposal_id, created_at) sind hier optional — Validation arbeitet sowohl
// auf persistierten Rows als auch auf Editor-Drafts.
export type MilestoneInput = Pick<
  PaymentMilestone,
  "sequence" | "percent" | "due_trigger" | "due_offset_days" | "label"
>;

export function validateMilestoneTrigger(
  m: MilestoneInput,
): MilestonesValidationResult {
  if (!VALID_TRIGGERS.includes(m.due_trigger)) {
    return {
      ok: false,
      error: `Ungueltiger Trigger '${m.due_trigger}'`,
    };
  }

  if (m.due_trigger === "days_after_signature") {
    if (
      m.due_offset_days === null ||
      m.due_offset_days === undefined ||
      !Number.isInteger(m.due_offset_days) ||
      m.due_offset_days <= 0
    ) {
      return {
        ok: false,
        error: "Tage-Offset muss eine ganze Zahl > 0 sein",
      };
    }
  } else {
    if (m.due_offset_days !== null && m.due_offset_days !== undefined) {
      return {
        ok: false,
        error:
          "Tage-Offset darf nur bei Trigger 'days_after_signature' gesetzt sein",
      };
    }
  }

  if (!(m.percent > 0) || m.percent > 100) {
    return {
      ok: false,
      error: "Prozent muss > 0 und <= 100 sein",
    };
  }

  return { ok: true };
}

export function validateMilestonesSum(
  milestones: ReadonlyArray<MilestoneInput>,
): MilestonesValidationResult {
  if (milestones.length === 0) {
    return { ok: true };
  }

  // toFixed(2) Rundung — DB-Spalte ist NUMERIC(5,2). Strict 100.00.
  const sum = milestones.reduce((s, m) => s + m.percent, 0);
  const rounded = Number(sum.toFixed(2));

  if (rounded !== 100) {
    const diff = Number((100 - rounded).toFixed(2));
    return {
      ok: false,
      error:
        diff > 0
          ? `Summe ${rounded.toFixed(2)}% — fehlt ${diff.toFixed(2)}%`
          : `Summe ${rounded.toFixed(2)}% — ueberschreitet um ${(-diff).toFixed(2)}%`,
    };
  }

  // Sequenzen muessen 1-based, lueckenlos und eindeutig sein.
  const sortedSeq = [...milestones].map((m) => m.sequence).sort((a, b) => a - b);
  for (let i = 0; i < sortedSeq.length; i++) {
    if (sortedSeq[i] !== i + 1) {
      return {
        ok: false,
        error: "Sequenzen muessen 1-based und lueckenlos sein",
      };
    }
  }

  return { ok: true };
}
