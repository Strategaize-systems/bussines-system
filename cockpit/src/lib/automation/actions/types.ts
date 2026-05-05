// V6.2 SLC-622 — Action-Handler Common-Types
//
// Einheitliche Signature aller Action-Handler.

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Action,
  ActionResult,
  AutomationRule,
} from "@/types/automation";

/**
 * Snapshot der Trigger-Entity fuer Action-Execution.
 * Bei Deal-Triggern: Deal-Row inkl. relevanter Beziehungen.
 * Bei Activity-Triggern: Activity-Row.
 */
export interface ActionEntityContext {
  type: "deal" | "activity";
  id: string;
  /** Voller Row-Snapshot, vom Executor geladen. */
  data: Record<string, unknown>;
  /** Bei Deal: deal.contact_id; bei Activity: activity.contact_id. */
  contactId: string | null;
  /** Bei Deal: deal.company_id; bei Activity: activity.company_id. */
  companyId: string | null;
  /** Bei Deal: deal.id; bei Activity: activity.deal_id. */
  dealId: string | null;
}

export interface ActionExecutionContext {
  supabase: SupabaseClient;
  rule: Pick<AutomationRule, "id" | "name">;
  entity: ActionEntityContext;
  /** Action-Index in rule.actions (fuer ActionResult). */
  actionIndex: number;
  /** triggerEventAuditId aus dem dispatcher (fuer audit_log-Crossref). */
  triggerEventAuditId: string | null;
  /** Resolved actor_id des Original-Triggers (audit_log.actor_id). */
  triggerUserId: string | null;
}

export type ActionHandler<T extends Action = Action> = (
  context: ActionExecutionContext,
  params: T extends { params: infer P } ? P : never
) => Promise<ActionResult>;
