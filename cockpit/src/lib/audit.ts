"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuditAction =
  | "stage_change"
  | "status_change"
  | "create"
  | "update"
  | "delete"
  // V5.7 SLC-571 MT-7 — explizites Audit fuer Reverse-Charge-Status-Aenderung
  // (DEC-126). Action-Wert wird vom Cockpit-Audit-Log ausgewertet.
  | "reverse_charge_toggled"
  // V8.7-A SLC-871 MT-3 — IS-Knowledge-API-Aufruf vom KI-Workspace (DEC-257).
  | "knowledge_queried";

export type AuditEntityType =
  | "deal"
  | "meeting"
  | "task"
  | "contact"
  | "company"
  | "proposal"
  | "pipeline"
  | "payment_terms_template"
  // V6.2 SLC-621 — Workflow-Automation Rule-CRUD
  | "automation_rule"
  // V6.2 SLC-624 — Campaign-CRUD (FEAT-622)
  | "campaign"
  // V8.7-A SLC-871 MT-3 — Konzeptueller Entity-Type fuer IS-Knowledge-API,
  // kein DB-FK (DEC-257 + DEC-258).
  | "is_knowledge_api";

export interface AuditParams {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  context?: string;
}

/**
 * Log an audit trail entry for a critical mutation.
 *
 * Design: fire-and-forget — callers should NOT await this.
 * Audit failure must never block or break the business operation.
 *
 * V8.11 SLC-904 (MIG-048): audit_log_insert is WITH CHECK (false) for authenticated.
 * We use createAdminClient() for the INSERT path (service_role bypasses RLS), while
 * still reading the current user via createClient() (user-session) to determine actor_id.
 */
export async function logAudit(params: AuditParams): Promise<void> {
  try {
    const supabase = await createClient();

    // Get current user from session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // No authenticated user — skip silently
      return;
    }

    const admin = createAdminClient();
    await admin.from("audit_log").insert({
      actor_id: user.id,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      changes: params.changes ?? null,
      context: params.context ?? null,
    });
  } catch {
    // Swallow all errors — audit must never break business operations
  }
}

/**
 * V6.2 SLC-622 — wie logAudit, aber returnt die audit_log.id (oder null).
 *
 * Wird von Trigger-Source-Pfaden (updateDealStage, createDeal,
 * createActivity-Helper, ...) verwendet, um eine eindeutige
 * `triggerEventAuditId` an `dispatchAutomationTrigger` weiterzureichen
 * (Anti-Loop-Token).
 *
 * Im Gegensatz zu `logAudit` ist diese Funktion `await`-ed, weil der
 * Workflow-Dispatcher die ID braucht. Bei Fehler oder fehlendem User
 * returnt `null` — der Aufrufer kann dann auf entityId-Fallback gehen.
 */
export async function logAuditWithId(
  params: AuditParams
): Promise<string | null> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    // V8.11 SLC-904 (MIG-048): INSERT via admin client (service_role bypasses RLS).
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("audit_log")
      .insert({
        actor_id: user.id,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId,
        changes: params.changes ?? null,
        context: params.context ?? null,
      })
      .select("id")
      .maybeSingle();

    if (error || !data) return null;
    return (data as { id: string }).id;
  } catch {
    return null;
  }
}

// V8.7-A SLC-871 MT-3 — logIsKnowledgeQuery Wrapper (DEC-258).
//
// Schreibt einen audit_log-Eintrag bei jedem ERFOLGREICHEN IS-Knowledge-
// Search. Failure-Pfade (auth/rate_limit/timeout/network/server) werden
// NICHT geloggt — sie sind Connection-Probleme, kein Knowledge-Query-Event.
//
// Der reine Payload-Builder lebt in src/lib/audit-is-knowledge.ts (ohne
// "use server"-Direktive), damit er pure und ohne Supabase-Mock einzeln
// testbar bleibt. Hier nur der async-Wrapper, der ueber logAudit schreibt.

import {
  buildIsKnowledgeQueryAuditParams,
  type IsKnowledgeQueryAuditParams,
} from "./audit-is-knowledge";

export async function logIsKnowledgeQuery(
  params: IsKnowledgeQueryAuditParams
): Promise<void> {
  await logAudit(buildIsKnowledgeQueryAuditParams(params));
}

/**
 * Get the current user's role from the profiles table.
 *
 * V8.14 SLC-912 MT-5 (ISSUE-104): fail-CLOSED. Returnt `null` bei null-user,
 * fehlendem Profil oder jedem Fehler — NIEMALS ein privilegiertes Default wie
 * 'admin'. Caller (z.B. /audit-log) muessen `role !== "admin"` explizit gaten.
 * Frueheres fail-open ('admin' by default) war ein inverted Threat-Model.
 */
export async function getCurrentUserRole(): Promise<string | null> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    return profile?.role ?? null;
  } catch {
    return null;
  }
}
