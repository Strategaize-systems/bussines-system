"use server";

import { createClient } from "@/lib/supabase/server";

export type AuditAction =
  | "stage_change"
  | "status_change"
  | "create"
  | "update"
  | "delete";

export type AuditEntityType =
  | "deal"
  | "meeting"
  | "task"
  | "contact"
  | "company"
  | "proposal";

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

    await supabase.from("audit_log").insert({
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
 * Get the current user's role from the profiles table.
 * Returns 'admin' by default (single-user system).
 */
export async function getCurrentUserRole(): Promise<string> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return "admin";

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    return profile?.role ?? "admin";
  } catch {
    return "admin";
  }
}
