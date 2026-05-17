"use server";

// V7.5 SLC-754 MT-1 — Server-Action `previewNlRule()` fuer Trockenlauf-Karte.
//
// Per `feedback_use_server_value_export_forbidden`: aus diesem `"use server"`-File
// werden ausschliesslich async functions exportiert (keine Const-Arrays, Enums,
// Type-Guards). Result-Type stammt aus dry-run.ts.
//
// Flow:
//   1. getProfile() + role-in ["admin","teamlead"] sonst "forbidden".
//   2. Synthetic AutomationRule aus SculptSuccess-Schema bauen (kein DB-Insert).
//   3. V6.2 dryRunRule(rule, daysBack=7) aus SLC-622 (DEC-132-Reuse).
//   4. DryRunResult zurueckgeben.
//
// Reuse-Trail:
//   - lib/automation/dry-run.ts dryRunRule (V6.2 SLC-622 MT-1, DEC-132)
//   - lib/auth/get-profile.ts getProfile (SLC-701)
//   - lib/automation/sculptor-schema.ts SculptSuccess (SLC-752 MT-3)

import { getProfile } from "@/lib/auth/get-profile";
import { dryRunRule, type DryRunResult } from "@/lib/automation/dry-run";
import type { SculptSuccess } from "@/lib/automation/sculptor-schema";
import type { AutomationRule } from "@/types/automation";

const PREVIEW_DAYS_BACK = 7;

export type PreviewNlRuleResult =
  | { ok: true; result: DryRunResult }
  | { ok: false; error: "forbidden" | "infra"; message: string };

export async function previewNlRule(
  schema: SculptSuccess
): Promise<PreviewNlRuleResult> {
  const profile = await getProfile();
  if (profile.role !== "admin" && profile.role !== "teamlead") {
    return {
      ok: false,
      error: "forbidden",
      message: "Nur Admin oder Teamlead darf den Trockenlauf ausfuehren.",
    };
  }

  const syntheticRule: AutomationRule = {
    id: "preview-synthetic",
    name: schema.name,
    description: schema.description ?? null,
    status: "active",
    trigger_event: schema.trigger_event,
    trigger_config: schema.trigger_config,
    conditions: schema.conditions,
    actions: schema.actions,
    references_stage_ids: [],
    paused_reason: null,
    created_by: profile.user_id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_run_at: null,
    last_run_status: null,
  };

  try {
    const result = await dryRunRule(syntheticRule, PREVIEW_DAYS_BACK);
    return { ok: true, result };
  } catch (e) {
    return {
      ok: false,
      error: "infra",
      message: `Trockenlauf fehlgeschlagen: ${(e as Error).message}`,
    };
  }
}
