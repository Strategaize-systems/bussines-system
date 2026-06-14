import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { guardExportTenant, parseExportParams, exportResponse } from "@/lib/export/helpers";

export async function GET(request: NextRequest) {
  // V8.15 SLC-913 MT-7 (ISSUE-116): Tenant-scope ueber decided_by (ai_action_queue
  // hat kein owner_user_id; approved-Rows haben decided_by gesetzt = der Team-User
  // der die Aktion freigegeben hat = Tenant-Grenze, DEC-302). NULL decided_by
  // faellt aus dem .in raus = fail-closed.
  const identity = await guardExportTenant(request);
  if (identity instanceof NextResponse) return identity;

  const params = parseExportParams(request);
  const supabase = createAdminClient();
  const offset = (params.page - 1) * params.limit;

  // Insights = approved actions from ai_action_queue
  let countQuery = supabase
    .from("ai_action_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved")
    .in("decided_by", identity.teamMemberIds);
  if (params.since) countQuery = countQuery.gte("created_at", params.since);
  if (params.until) countQuery = countQuery.lte("created_at", params.until);
  const { count } = await countQuery;

  let query = supabase
    .from("ai_action_queue")
    .select(
      "id, type, action_description, reasoning, entity_type, entity_id, source, priority, status, suggested_at, decided_at, decided_by, execution_result, created_at"
    )
    .eq("status", "approved")
    .in("decided_by", identity.teamMemberIds)
    .order("created_at", { ascending: false })
    .range(offset, offset + params.limit - 1);

  if (params.since) query = query.gte("created_at", params.since);
  if (params.until) query = query.lte("created_at", params.until);

  const { data, error } = await query;
  if (error) {
    return exportResponse([], 0, params);
  }

  return exportResponse(data ?? [], count ?? 0, params);
}
