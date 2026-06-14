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

  // Count
  let countQuery = supabase
    .from("deals")
    .select("id", { count: "exact", head: true })
    .in("owner_user_id", identity.teamMemberIds);
  if (params.since) countQuery = countQuery.gte("created_at", params.since);
  if (params.until) countQuery = countQuery.lte("created_at", params.until);
  const { count } = await countQuery;

  // Data
  let query = supabase
    .from("deals")
    .select(
      "id, title, status, value, expected_close_date, stage_id, contact_id, company_id, pipeline_id, source, created_at, updated_at, pipeline_stages(name), contacts(first_name, last_name, email), companies(name)"
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
