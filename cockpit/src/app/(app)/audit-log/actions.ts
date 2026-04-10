"use server";

import { createClient } from "@/lib/supabase/server";

export type AuditLogEntry = {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes: { before?: Record<string, unknown>; after?: Record<string, unknown> } | null;
  context: string | null;
  created_at: string;
  profiles: { display_name: string | null } | null;
};

export type AuditLogFilters = {
  entityType?: string;
  action?: string;
  page?: number;
};

const PAGE_SIZE = 20;

export async function getAuditLogs(
  filters?: AuditLogFilters
): Promise<AuditLogEntry[]> {
  const supabase = await createClient();
  const page = filters?.page ?? 1;
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (filters?.entityType) {
    query = query.eq("entity_type", filters.entityType);
  }
  if (filters?.action) {
    query = query.eq("action", filters.action);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  // Manual profile lookup (no FK from audit_log.actor_id to profiles)
  const actorIds = [...new Set((data ?? []).map((e: any) => e.actor_id))];
  const profileMap = new Map<string, string | null>();
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", actorIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.id, p.display_name);
    }
  }

  return (data ?? []).map((e: any) => ({
    ...e,
    profiles: { display_name: profileMap.get(e.actor_id) ?? null },
  })) as AuditLogEntry[];
}

export async function getAuditLogCount(
  filters?: Pick<AuditLogFilters, "entityType" | "action">
): Promise<number> {
  const supabase = await createClient();

  let query = supabase
    .from("audit_log")
    .select("id", { count: "exact", head: true });

  if (filters?.entityType) {
    query = query.eq("entity_type", filters.entityType);
  }
  if (filters?.action) {
    query = query.eq("action", filters.action);
  }

  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}
