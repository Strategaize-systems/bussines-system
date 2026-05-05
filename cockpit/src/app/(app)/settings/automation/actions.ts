"use server";

// V6.2 SLC-621 MT-7 + SLC-623 — Workflow-Automation Server Actions

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { isFieldWhitelisted } from "@/lib/automation/field-whitelist";
import { dryRunRule, type DryRunResult } from "@/lib/automation/dry-run";
import type {
  Action,
  AutomationRule,
  AutomationRuleListItem,
  Condition,
  SaveAutomationRuleInput,
  TriggerEvent,
} from "@/types/automation";

const TABLE = "automation_rules";
const RUNS_TABLE = "automation_runs";

const VALID_TRIGGER_EVENTS: TriggerEvent[] = [
  "deal.stage_changed",
  "deal.created",
  "activity.created",
];
const VALID_ACTION_TYPES = [
  "create_task",
  "send_email_template",
  "create_activity",
  "update_field",
];
const MAX_NAME_LEN = 120;

async function requireUser() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Nicht authentifiziert");
  return { supabase, user: auth.user };
}

/**
 * Validiert Save-Input. Gibt Error-String oder null zurueck.
 */
function validateRuleInput(input: SaveAutomationRuleInput): string | null {
  const name = input.name?.trim() ?? "";
  if (!name) return "Name darf nicht leer sein";
  if (name.length > MAX_NAME_LEN)
    return `Name zu lang (max ${MAX_NAME_LEN} Zeichen)`;

  if (!VALID_TRIGGER_EVENTS.includes(input.trigger_event)) {
    return `Ungueltiger trigger_event: ${input.trigger_event}`;
  }

  if (!Array.isArray(input.conditions)) return "conditions muss Array sein";
  if (!Array.isArray(input.actions)) return "actions muss Array sein";
  if (input.actions.length === 0)
    return "Mindestens eine Action erforderlich";

  for (const [i, action] of input.actions.entries()) {
    if (!action || typeof action !== "object")
      return `Action #${i + 1} ist ungueltig`;
    if (!VALID_ACTION_TYPES.includes(action.type))
      return `Action #${i + 1} hat ungueltigen Type: ${action.type}`;
    if (action.type === "update_field") {
      const params = action.params;
      if (!params || typeof params !== "object")
        return `Action #${i + 1} (update_field) hat keine params`;
      if (!isFieldWhitelisted(params.entity, params.field)) {
        return `Action #${i + 1}: Feld '${params.entity}.${params.field}' ist nicht in der Whitelist`;
      }
    }
  }

  return null;
}

/**
 * Walk durch trigger_config + conditions, sammle alle stage_id-References.
 * Wird denormalisiert in `references_stage_ids` gespeichert fuer
 * Stage-Delete-Soft-Disable (DEC-133, SLC-622).
 */
function collectStageIds(
  trigger_config: Record<string, unknown>,
  conditions: Condition[]
): string[] {
  const ids = new Set<string>();
  // Trigger-Config: stage_id-Property
  if (trigger_config && typeof trigger_config === "object") {
    const sid = trigger_config.stage_id;
    if (typeof sid === "string") ids.add(sid);
  }
  // Conditions: field === 'stage_id'
  for (const c of conditions ?? []) {
    if (c && typeof c === "object" && c.field === "stage_id") {
      if (typeof c.value === "string") ids.add(c.value);
      else if (Array.isArray(c.value))
        c.value.forEach((v) => {
          if (typeof v === "string") ids.add(v);
        });
    }
  }
  return Array.from(ids);
}

/**
 * Liste aller Rules mit JOIN auf last automation_run + 7-Tage-Statistik.
 */
export async function listAutomationRules(): Promise<AutomationRuleListItem[]> {
  const { supabase } = await requireUser();

  const { data: rules, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!rules || rules.length === 0) return [];

  // Aggregate-Stats per Rule (Single-Roundtrip via group-aggregate)
  const ruleIds = rules.map((r) => r.id);
  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const { data: runs, error: runsErr } = await supabase
    .from(RUNS_TABLE)
    .select("rule_id, status")
    .in("rule_id", ruleIds)
    .gte("started_at", since);

  if (runsErr) throw new Error(runsErr.message);

  const stats = new Map<string, { total: number; success: number }>();
  for (const r of runs ?? []) {
    const cur = stats.get(r.rule_id) ?? { total: 0, success: 0 };
    cur.total += 1;
    if (r.status === "success") cur.success += 1;
    stats.set(r.rule_id, cur);
  }

  return rules.map((rule) => {
    const s = stats.get(rule.id) ?? { total: 0, success: 0 };
    return {
      ...(rule as AutomationRule),
      run_count_7d: s.total,
      success_count_7d: s.success,
    };
  });
}

/**
 * Save (INSERT oder UPDATE). Bei UPDATE muss `id` gesetzt sein.
 */
export async function saveAutomationRule(
  input: SaveAutomationRuleInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { supabase, user } = await requireUser();

  const error = validateRuleInput(input);
  if (error) return { ok: false, error };

  const references_stage_ids = collectStageIds(
    input.trigger_config as Record<string, unknown>,
    input.conditions
  );

  const payload = {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    status: input.status,
    trigger_event: input.trigger_event,
    trigger_config: input.trigger_config,
    conditions: input.conditions as Condition[],
    actions: input.actions as Action[],
    references_stage_ids,
    paused_reason: null,
  };

  if (input.id) {
    const { error: updErr } = await supabase
      .from(TABLE)
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", input.id);
    if (updErr) return { ok: false, error: updErr.message };
    void logAudit({
      action: "update",
      entityType: "automation_rule",
      entityId: input.id,
      changes: { after: { name: payload.name, status: payload.status } },
    });
    revalidatePath("/settings/automation");
    return { ok: true, id: input.id };
  }

  const { data, error: insErr } = await supabase
    .from(TABLE)
    .insert({ ...payload, created_by: user.id })
    .select("id")
    .single();
  if (insErr) return { ok: false, error: insErr.message };
  void logAudit({
    action: "create",
    entityType: "automation_rule",
    entityId: data.id,
    changes: { after: { name: payload.name, trigger: payload.trigger_event } },
  });
  revalidatePath("/settings/automation");
  return { ok: true, id: data.id };
}

export async function pauseAutomationRule(
  id: string,
  reason?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from(TABLE)
    .update({
      status: "paused",
      paused_reason: reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  void logAudit({
    action: "update",
    entityType: "automation_rule",
    entityId: id,
    changes: { after: { status: "paused", paused_reason: reason ?? null } },
  });
  revalidatePath("/settings/automation");
  return { ok: true };
}

export async function activateAutomationRule(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from(TABLE)
    .update({
      status: "active",
      paused_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  void logAudit({
    action: "update",
    entityType: "automation_rule",
    entityId: id,
    changes: { after: { status: "active" } },
  });
  revalidatePath("/settings/automation");
  return { ok: true };
}

export async function deleteAutomationRule(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase } = await requireUser();
  // CASCADE entfernt automation_runs automatisch via FK
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  void logAudit({
    action: "delete",
    entityType: "automation_rule",
    entityId: id,
  });
  revalidatePath("/settings/automation");
  return { ok: true };
}

/**
 * V6.2 SLC-623 — Trockenlauf einer Rule.
 *
 * Read-only: liest historische audit_log/deals/activities und matcht conditions.
 * Schreibt KEINE INSERT/UPDATE waehrend Dry-Run (DEC-132).
 *
 * Akzeptiert eine input-Rule (kann ungespeicherte Form-Daten sein) oder eine
 * existierende rule.id (laedt aus DB). Bei beiden Pfaden Auth-Check.
 */
export async function runDryRun(
  input: SaveAutomationRuleInput | { id: string },
  daysBack = 30
): Promise<{ ok: true; result: DryRunResult } | { ok: false; error: string }> {
  const { supabase } = await requireUser();

  let rule: AutomationRule;
  if ("id" in input && Object.keys(input).length === 1) {
    // Persisted-Rule via id
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", input.id)
      .maybeSingle();
    if (error || !data) {
      return {
        ok: false,
        error: error?.message ?? `Regel ${input.id} nicht gefunden`,
      };
    }
    rule = data as AutomationRule;
  } else {
    // Form-Daten (ungespeicherte Rule). Validation analog saveAutomationRule.
    const draftInput = input as SaveAutomationRuleInput;
    const validErr = validateRuleInput(draftInput);
    if (validErr) return { ok: false, error: validErr };

    rule = {
      id: draftInput.id ?? "draft",
      name: draftInput.name.trim(),
      description: draftInput.description ?? null,
      status: "active",
      trigger_event: draftInput.trigger_event,
      trigger_config: draftInput.trigger_config,
      conditions: draftInput.conditions,
      actions: draftInput.actions,
      references_stage_ids: [],
      paused_reason: null,
      created_by: "draft",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_run_at: null,
      last_run_status: null,
    };
  }

  try {
    const result = await dryRunRule(rule, daysBack);
    return { ok: true, result };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unbekannter Fehler",
    };
  }
}
