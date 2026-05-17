"use server";

// V7.5 SLC-754 MT-2 — Server-Action `applyNlRule()` fuer Apply-Confirmation-Modal.
//
// Per `feedback_use_server_value_export_forbidden`: aus diesem `"use server"`-File
// werden ausschliesslich async functions exportiert (Types/Interfaces sind erlaubt).
//
// Flow:
//   1. assertNotReadOnlyContext (V7 Drilldown-Block).
//   2. getProfile() + role-in ["admin","teamlead"] sonst "forbidden".
//   3. Re-Validate gegen SculptSuccessSchema (Defense-in-Depth — User koennte
//      Schema-Karte zwischen Sculpt und Apply editiert haben).
//   4. assertNotDuplicateRuleDb gegen identische bestehende Rule (Soft-Dedup, SLC-752 MT-7).
//   5. INSERT automation_rules mit created_via='nl_sculptor' + status='active'.
//   6. INSERT audit_log mit action='automation_rule.create_via_nl' + Sculpt-Metadata.
//   7. revalidatePath /settings/automation + /mein-tag.
//
// Reuse-Trail:
//   - lib/automation/sculptor-schema.ts SculptSuccessSchema (SLC-752 MT-3)
//   - lib/automation/sculptor-dedup.ts assertNotDuplicateRuleDb (SLC-752 MT-7)
//   - lib/auth/get-profile.ts getProfile (SLC-701)
//   - lib/auth/read-only-context.ts assertNotReadOnlyContext (SLC-706 + SLC-751)
//   - app/(app)/settings/automation/actions.ts saveAutomationRule (V6.2 INSERT-Pattern)

import { revalidatePath } from "next/cache";

import { getProfile } from "@/lib/auth/get-profile";
import { assertNotReadOnlyContext } from "@/lib/auth/read-only-context";
import { createClient } from "@/lib/supabase/server";
import { SculptSuccessSchema } from "@/lib/automation/sculptor-schema";
import {
  DuplicateRuleError,
  assertNotDuplicateRuleDb,
} from "@/lib/automation/sculptor-dedup";
import type { SculptSuccess } from "@/lib/automation/sculptor-schema";
import type { Condition } from "@/types/automation";

export interface ApplyNlRuleInput {
  schema: SculptSuccess;
  nl_input: string;
  sculpt_audit_id: string;
  sculptor_cost_usd: number;
  edited_in_form: boolean;
}

export type ApplyNlRuleResult =
  | { ok: true; rule_id: string }
  | {
      ok: false;
      error: "forbidden" | "validation" | "duplicate" | "infra";
      message: string;
      existing_rule_id?: string;
    };

function collectStageIds(
  triggerConfig: unknown,
  conditions: Condition[]
): string[] {
  const ids = new Set<string>();
  if (triggerConfig && typeof triggerConfig === "object") {
    const cfg = triggerConfig as { stage_id?: string };
    if (typeof cfg.stage_id === "string") ids.add(cfg.stage_id);
  }
  for (const c of conditions ?? []) {
    if (c.field === "stage_id") {
      if (typeof c.value === "string") ids.add(c.value);
      else if (Array.isArray(c.value)) {
        for (const v of c.value) if (typeof v === "string") ids.add(v);
      }
    }
  }
  return Array.from(ids);
}

export async function applyNlRule(
  input: ApplyNlRuleInput
): Promise<ApplyNlRuleResult> {
  await assertNotReadOnlyContext();

  const profile = await getProfile();
  if (profile.role !== "admin" && profile.role !== "teamlead") {
    return {
      ok: false,
      error: "forbidden",
      message: "Nur Admin oder Teamlead darf eine Regel aktivieren.",
    };
  }

  // Re-Validate (Defense-in-Depth gegen User-Edits zwischen Sculpt und Apply).
  const parsed = SculptSuccessSchema.safeParse(input.schema);
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation",
      message: `Schema ungueltig: ${parsed.error.message}`,
    };
  }
  const schema = parsed.data;

  const supabase = await createClient();

  // Dedup-Check
  try {
    await assertNotDuplicateRuleDb(
      supabase,
      {
        name: schema.name,
        trigger_event: schema.trigger_event,
        conditions: schema.conditions,
        actions: schema.actions,
      },
      profile.user_id
    );
  } catch (e) {
    if (e instanceof DuplicateRuleError) {
      return {
        ok: false,
        error: "duplicate",
        message: `Es gibt bereits eine identische Regel: "${e.ruleName}".`,
        existing_rule_id: e.existingRuleId,
      };
    }
    return {
      ok: false,
      error: "infra",
      message: `Dedup-Check fehlgeschlagen: ${(e as Error).message}`,
    };
  }

  const references_stage_ids = collectStageIds(
    schema.trigger_config,
    schema.conditions
  );

  // INSERT automation_rules
  const { data: ruleRow, error: insErr } = await supabase
    .from("automation_rules")
    .insert({
      name: schema.name,
      description: schema.description ?? null,
      status: "active",
      trigger_event: schema.trigger_event,
      trigger_config: schema.trigger_config,
      conditions: schema.conditions,
      actions: schema.actions,
      references_stage_ids,
      paused_reason: null,
      created_by: profile.user_id,
      created_via: "nl_sculptor",
    })
    .select("id")
    .single();

  if (insErr || !ruleRow) {
    return {
      ok: false,
      error: "infra",
      message: `Rule-Insert fehlgeschlagen: ${insErr?.message ?? "no row returned"}`,
    };
  }

  const ruleId = (ruleRow as { id: string }).id;

  // INSERT audit_log (best-effort, never blocks)
  try {
    await supabase.from("audit_log").insert({
      actor_id: profile.user_id,
      action: "automation_rule.create_via_nl",
      entity_type: "automation_rule",
      entity_id: ruleId,
      changes: null,
      context: JSON.stringify({
        nl_input: input.nl_input,
        sculpt_audit_id: input.sculpt_audit_id,
        sculptor_cost_usd: input.sculptor_cost_usd,
        edited_in_form: input.edited_in_form,
      }),
    });
  } catch {
    // best-effort — Apply-Flow darf nicht an Audit-Insert sterben.
  }

  revalidatePath("/settings/automation");
  revalidatePath("/mein-tag");

  return { ok: true, rule_id: ruleId };
}
