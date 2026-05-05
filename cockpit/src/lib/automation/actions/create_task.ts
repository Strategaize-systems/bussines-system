// V6.2 SLC-622 MT-1 — Action-Handler: create_task
//
// Legt eine Activity vom Typ 'task' an mit Assignee aus AssigneeSource.
// Title kann Template-Variablen ({{deal.title}}, {{contact.name}}) enthalten.

import type { ActionResult, CreateTaskParams } from "@/types/automation";
import { renderTemplate } from "../template-renderer";
import {
  resolveAssignee,
  AssigneeResolutionError,
} from "../assignee-resolver";
import type { ActionExecutionContext } from "./types";

export async function executeCreateTask(
  context: ActionExecutionContext,
  params: CreateTaskParams
): Promise<ActionResult> {
  const { supabase, entity, actionIndex, rule, triggerUserId } = context;

  try {
    // 1. Assignee resolven
    const ownerId =
      (entity.data.owner_id as string | null | undefined) ?? null;
    const createdBy =
      (entity.data.created_by as string | null | undefined) ?? null;

    let assigneeId: string;
    try {
      assigneeId = resolveAssignee(params.assignee, {
        entityOwnerId: ownerId,
        entityCreatedBy: createdBy,
        triggerUserId,
      });
    } catch (e) {
      if (e instanceof AssigneeResolutionError) {
        return {
          action_index: actionIndex,
          type: "create_task",
          outcome: "failed",
          error_message: `assignee-resolve: ${e.message}`,
        };
      }
      throw e;
    }

    // 2. Title rendern
    const title = renderTemplate(params.title, {
      deal: entity.type === "deal" ? entity.data : {},
      activity: entity.type === "activity" ? entity.data : {},
      rule: { name: rule.name },
    });
    if (!title.trim()) {
      return {
        action_index: actionIndex,
        type: "create_task",
        outcome: "failed",
        error_message: "title-leer-nach-rendering",
      };
    }

    // 3. due_at berechnen (optional: due_in_days)
    let dueDate: string | null = null;
    if (typeof params.due_in_days === "number" && params.due_in_days >= 0) {
      const d = new Date(Date.now() + params.due_in_days * 86_400_000);
      dueDate = d.toISOString();
    }

    // 4. Activity-Insert
    const { data: inserted, error } = await supabase
      .from("activities")
      .insert({
        contact_id: entity.contactId,
        company_id: entity.companyId,
        deal_id: entity.dealId,
        type: "task",
        title: title.slice(0, 500),
        due_date: dueDate,
        // assignee in description als V1-Workaround (V2: dedizierte
        // task-Tabelle mit assignee_id-Spalte)
        description: `Assignee: ${assigneeId}\nAusgeloest durch Automation-Regel: ${rule.name}`,
      })
      .select("id")
      .single();

    if (error) {
      return {
        action_index: actionIndex,
        type: "create_task",
        outcome: "failed",
        error_message: `db-insert: ${error.message}`.slice(0, 500),
      };
    }

    return {
      action_index: actionIndex,
      type: "create_task",
      outcome: "success",
      audit_log_id: inserted?.id,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return {
      action_index: actionIndex,
      type: "create_task",
      outcome: "failed",
      error_message: `unexpected: ${msg}`.slice(0, 500),
    };
  }
}
