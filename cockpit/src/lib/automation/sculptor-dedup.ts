// V7.5 SLC-752 MT-7 — Sculpt-Dedup-Pure-Function + DB-Fetcher.
//
// Verhindert dass der NL-Sculptor zwei semantisch identische Rules fuer
// denselben User anlegt. Match-Kriterium: (created_by, name, trigger_event,
// conditions==, actions==).
//
// Konsumiert von SLC-754 Apply-Action (`applyNlRule`). Reuse-bereit fuer
// Click-Wizard-Apply (SLC-753) — beide Pfade rufen `assertNotDuplicateRule`
// vor INSERT auf, damit ein NL-erzeugter Vorschlag nicht versehentlich einen
// Click-Wizard-Doppel-Eintrag erzeugt.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Action, Condition, TriggerEvent } from "@/types/automation";

export interface DedupCandidate {
  id: string;
  conditions: Condition[];
  actions: Action[];
}

export interface DedupRuleShape {
  name: string;
  trigger_event: TriggerEvent;
  conditions: Condition[];
  actions: Action[];
}

export class DuplicateRuleError extends Error {
  readonly existingRuleId: string;
  readonly ownerUserId: string;
  readonly ruleName: string;

  constructor(existingRuleId: string, ownerUserId: string, ruleName: string) {
    super(
      `DuplicateRuleError: Regel '${ruleName}' existiert bereits fuer User ${ownerUserId} (id=${existingRuleId}).`
    );
    this.name = "DuplicateRuleError";
    this.existingRuleId = existingRuleId;
    this.ownerUserId = ownerUserId;
    this.ruleName = ruleName;
  }
}

/**
 * Tiefe Equality fuer JSONB-Werte. Wir vergleichen via canonical JSON.stringify
 * (das in V6.2-Schreibpfaden konsistent verwendet wird). Wenn Drift im
 * Object-Key-Order auftritt, kann das in einer V7.6-Erweiterung durch
 * sortKeys ergaenzt werden — Aktuell V6.2-Praxis ist Key-Order stabil.
 */
function deepEqualJsonb(a: unknown, b: unknown): boolean {
  return canonicalStringify(a) === canonicalStringify(b);
}

function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalStringify).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalStringify(v)}`).join(",")}}`;
}

/**
 * Pure-Function-Test: pruefe ob ein Candidate semantisch identisch zur Rule ist.
 * Wirft DuplicateRuleError bei Match.
 */
export function assertNotDuplicateRule(
  candidates: readonly DedupCandidate[],
  rule: DedupRuleShape,
  userId: string
): void {
  for (const c of candidates) {
    if (
      deepEqualJsonb(c.conditions, rule.conditions) &&
      deepEqualJsonb(c.actions, rule.actions)
    ) {
      throw new DuplicateRuleError(c.id, userId, rule.name);
    }
  }
}

/**
 * DB-Fetcher: holt alle Candidates fuer (userId, name, trigger_event) aus
 * automation_rules. Anschliessend ruft der Caller `assertNotDuplicateRule`
 * mit den Candidates auf.
 *
 * Trennung in Pure-Function + DB-Fetcher erlaubt:
 *   - Pure-Function-Tests ohne DB
 *   - Live-DB-Tests die Candidates direkt via pg.Client laden
 *   - Production-Aufrufe via supabase-js (createAdminClient)
 */
export async function fetchDedupCandidates(
  supabase: SupabaseClient,
  userId: string,
  rule: Pick<DedupRuleShape, "name" | "trigger_event">
): Promise<DedupCandidate[]> {
  const { data, error } = await supabase
    .from("automation_rules")
    .select("id, conditions, actions")
    .eq("created_by", userId)
    .eq("name", rule.name)
    .eq("trigger_event", rule.trigger_event);
  if (error) {
    throw new Error(`fetchDedupCandidates: ${error.message}`);
  }
  return (data ?? []).map((row: { id: string; conditions: unknown; actions: unknown }) => ({
    id: row.id,
    conditions: (row.conditions ?? []) as Condition[],
    actions: (row.actions ?? []) as Action[],
  }));
}

/**
 * Convenience-Combo: fetch + assert in einem Schritt fuer Production-Aufrufer.
 */
export async function assertNotDuplicateRuleDb(
  supabase: SupabaseClient,
  rule: DedupRuleShape,
  userId: string
): Promise<void> {
  const candidates = await fetchDedupCandidates(supabase, userId, rule);
  assertNotDuplicateRule(candidates, rule, userId);
}
