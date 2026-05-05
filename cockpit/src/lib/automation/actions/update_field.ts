// V6.2 SLC-622 MT-1 — Action-Handler: update_field
//
// Setzt ein einzelnes Feld auf einer Entity (deal | contact | company).
// PII-Schutz: nur die in field-whitelist.ts definierten Felder sind erlaubt.
// Validation pro Feld via FieldSpec.validate.
//
// audit_log-Side-Effect mit actor_id=NULL und triggered_by_user_id im
// changes-JSONB (DEC-131, DEC-118-Pattern).

import type { ActionResult, UpdateFieldParams } from "@/types/automation";
import {
  isFieldWhitelisted,
  validateFieldValue,
} from "../field-whitelist";
import type { ActionExecutionContext } from "./types";

const TABLE_BY_ENTITY: Record<UpdateFieldParams["entity"], string> = {
  deal: "deals",
  contact: "contacts",
  company: "companies",
};

export async function executeUpdateField(
  context: ActionExecutionContext,
  params: UpdateFieldParams
): Promise<ActionResult> {
  const { supabase, entity, actionIndex, rule, triggerUserId } = context;

  try {
    // 1. Whitelist-Pruefung (Defense-in-Depth — schon im Server-Action-
    // Validator aktiv, aber hier nochmal vor dem DB-Write)
    if (!isFieldWhitelisted(params.entity, params.field)) {
      return {
        action_index: actionIndex,
        type: "update_field",
        outcome: "failed",
        error_message: "field-not-whitelisted",
      };
    }

    // 2. Value-Validation
    const v = validateFieldValue(params.entity, params.field, params.value);
    if (!v.ok) {
      return {
        action_index: actionIndex,
        type: "update_field",
        outcome: "failed",
        error_message: `validation-failed: ${v.error}`.slice(0, 500),
      };
    }

    // 3. Target-Entity ermitteln. Bei Deal-Trigger fuer entity=deal: entity.id.
    // Bei Deal-Trigger fuer entity=contact/company: deal.contact_id /
    // deal.company_id (V1-Konvention: update_field aendert die zum Trigger
    // gehoerige Beziehung; ohne contact/company wird der Action-Failed).
    let targetId: string | null = null;
    if (params.entity === "deal") {
      targetId = entity.dealId ?? (entity.type === "deal" ? entity.id : null);
    } else if (params.entity === "contact") {
      targetId = entity.contactId;
    } else if (params.entity === "company") {
      targetId = entity.companyId;
    }

    if (!targetId) {
      return {
        action_index: actionIndex,
        type: "update_field",
        outcome: "failed",
        error_message: `target-not-resolvable: entity=${params.entity}`,
      };
    }

    // 4. UPDATE-Statement
    const tableName = TABLE_BY_ENTITY[params.entity];
    const updatePayload: Record<string, unknown> = {
      [params.field]: params.value,
      updated_at: new Date().toISOString(),
    };

    const { error: updErr } = await supabase
      .from(tableName)
      .update(updatePayload)
      .eq("id", targetId);

    if (updErr) {
      return {
        action_index: actionIndex,
        type: "update_field",
        outcome: "failed",
        error_message: `db-update: ${updErr.message}`.slice(0, 500),
      };
    }

    // 5. audit_log-Side-Effect (DEC-131)
    const { data: auditRow } = await supabase
      .from("audit_log")
      .insert({
        actor_id: null, // System-Side-Effect
        action: "update",
        entity_type: params.entity,
        entity_id: targetId,
        changes: {
          after: { [params.field]: params.value },
          triggered_by_user_id: triggerUserId,
          automation_rule_id: rule.id,
          automation_rule_name: rule.name,
        },
        context: `Automation rule "${rule.name}" executed`,
      })
      .select("id")
      .maybeSingle();

    return {
      action_index: actionIndex,
      type: "update_field",
      outcome: "success",
      audit_log_id: auditRow?.id ?? undefined,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return {
      action_index: actionIndex,
      type: "update_field",
      outcome: "failed",
      error_message: `unexpected: ${msg}`.slice(0, 500),
    };
  }
}
