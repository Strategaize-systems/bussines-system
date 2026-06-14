import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { guardExportTenant, parseExportParams, exportResponse } from "@/lib/export/helpers";

export async function GET(request: NextRequest) {
  // V8.15 SLC-913 MT-7 (ISSUE-116): Tenant-scope via per-Tenant-Key.
  const identity = await guardExportTenant(request);
  if (identity instanceof NextResponse) return identity;

  const params = parseExportParams(request);
  const supabase = createAdminClient();
  const offset = (params.page - 1) * params.limit;

  let countQuery = supabase
    .from("activities")
    .select("id", { count: "exact", head: true })
    .in("owner_user_id", identity.teamMemberIds);
  if (params.since) countQuery = countQuery.gte("created_at", params.since);
  if (params.until) countQuery = countQuery.lte("created_at", params.until);
  const { count } = await countQuery;

  let query = supabase
    .from("activities")
    .select(
      "id, type, deal_id, contact_id, company_id, title, notes, participants, objections, opportunities, risks, next_steps, created_at"
    )
    .in("owner_user_id", identity.teamMemberIds)
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
