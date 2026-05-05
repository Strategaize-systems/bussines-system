// V6.2 SLC-622 MT-2 — Assignee-Resolver (DEC-134)
//
// Wandelt einen `AssigneeSource` (deal_owner | trigger_user | {uuid}) in
// eine konkrete User-UUID um. Wird vom create_task-Action-Handler verwendet.
//
// V1 Single-User: alle Quellen resolven oft zum selben User. Trotzdem ist die
// Abstraktion wichtig fuer V2 (Multi-User + Routing/Territories).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssigneeSource } from "@/types/automation";

export interface AssigneeContext {
  /** owner_id der Trigger-Entity (z.B. deal.owner_id, falls vorhanden). */
  entityOwnerId?: string | null;
  /** created_by der Trigger-Entity (Fallback fuer entityOwnerId). */
  entityCreatedBy?: string | null;
  /** audit_log.actor_id des Trigger-Events. */
  triggerUserId?: string | null;
}

export class AssigneeResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssigneeResolutionError";
  }
}

/**
 * Resolved eine AssigneeSource gegen den AssigneeContext.
 *
 * - `deal_owner` → entityOwnerId || entityCreatedBy.
 * - `trigger_user` → triggerUserId.
 * - `{uuid: string}` → uuid (UUID-Format wird hier NICHT validiert; das
 *   passiert clientseitig im Server-Action-Validator).
 *
 * Wirft AssigneeResolutionError, wenn die Quelle nicht aufloesbar ist.
 */
export function resolveAssignee(
  source: AssigneeSource | undefined,
  context: AssigneeContext
): string {
  // Default = deal_owner (haeufigster V1-Fall)
  const src: AssigneeSource = source ?? "deal_owner";

  if (typeof src === "object" && src !== null && "uuid" in src) {
    if (!src.uuid || typeof src.uuid !== "string") {
      throw new AssigneeResolutionError(
        "Assignee-UUID ist leer oder kein String"
      );
    }
    return src.uuid;
  }

  if (src === "trigger_user") {
    if (!context.triggerUserId) {
      throw new AssigneeResolutionError(
        "trigger_user ist nicht aufloesbar (kein triggerUserId im Context)"
      );
    }
    return context.triggerUserId;
  }

  if (src === "deal_owner") {
    const id = context.entityOwnerId ?? context.entityCreatedBy ?? null;
    if (!id) {
      throw new AssigneeResolutionError(
        "deal_owner ist nicht aufloesbar (weder entityOwnerId noch entityCreatedBy gesetzt)"
      );
    }
    return id;
  }

  throw new AssigneeResolutionError(
    `Unbekannte AssigneeSource: ${JSON.stringify(src)}`
  );
}

/**
 * Helper: laedt aus audit_log einen actor_id-Lookup (fuer trigger_user-Source).
 * Wird vom Executor aufgerufen, wenn `triggerEventAuditId` vorhanden ist.
 */
export async function lookupActorIdFromAuditLog(
  supabase: SupabaseClient,
  auditLogId: string | null | undefined
): Promise<string | null> {
  if (!auditLogId) return null;
  const { data, error } = await supabase
    .from("audit_log")
    .select("actor_id")
    .eq("id", auditLogId)
    .maybeSingle();
  if (error || !data) return null;
  return (data.actor_id as string | null) ?? null;
}
