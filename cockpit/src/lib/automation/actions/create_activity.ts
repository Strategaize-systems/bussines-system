// V6.2 SLC-622 MT-1 — Action-Handler: create_activity
//
// Legt eine generische Activity-Row an (z.B. internal note, log entry).
// Title und description koennen Template-Variablen enthalten.

import type {
  ActionResult,
  CreateActivityParams,
} from "@/types/automation";
import { renderTemplate } from "../template-renderer";
import type { ActionExecutionContext } from "./types";

const ALLOWED_TYPES = new Set(["note", "task", "call", "email", "meeting"]);

export async function executeCreateActivity(
  context: ActionExecutionContext,
  params: CreateActivityParams
): Promise<ActionResult> {
  const { supabase, entity, actionIndex, rule } = context;

  try {
    if (!ALLOWED_TYPES.has(params.type)) {
      return {
        action_index: actionIndex,
        type: "create_activity",
        outcome: "failed",
        error_message: `invalid-type: ${params.type}`,
      };
    }

    const scope = {
      deal: entity.type === "deal" ? entity.data : {},
      activity: entity.type === "activity" ? entity.data : {},
      rule: { name: rule.name },
    };
    const title = renderTemplate(params.title, scope);
    const description = params.description
      ? renderTemplate(params.description, scope)
      : null;

    if (!title.trim()) {
      return {
        action_index: actionIndex,
        type: "create_activity",
        outcome: "failed",
        error_message: "title-leer-nach-rendering",
      };
    }

    const { data: inserted, error } = await supabase
      .from("activities")
      .insert({
        contact_id: entity.contactId,
        company_id: entity.companyId,
        deal_id: entity.dealId,
        type: params.type,
        title: title.slice(0, 500),
        description: description ? description.slice(0, 2000) : null,
      })
      .select("id")
      .single();

    if (error) {
      return {
        action_index: actionIndex,
        type: "create_activity",
        outcome: "failed",
        error_message: `db-insert: ${error.message}`.slice(0, 500),
      };
    }

    return {
      action_index: actionIndex,
      type: "create_activity",
      outcome: "success",
      audit_log_id: inserted?.id,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return {
      action_index: actionIndex,
      type: "create_activity",
      outcome: "failed",
      error_message: `unexpected: ${msg}`.slice(0, 500),
    };
  }
}
