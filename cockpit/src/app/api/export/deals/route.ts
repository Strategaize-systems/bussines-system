import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { guardExportRequest, parseExportParams, exportResponse } from "@/lib/export/helpers";

export async function GET(request: NextRequest) {
  const guard = guardExportRequest(request);
  if (guard) return guard;

  const params = parseExportParams(request);
  const supabase = createAdminClient();
  const offset = (params.page - 1) * params.limit;

  // Count
  let countQuery = supabase.from("deals").select("id", { count: "exact", head: true });
  if (params.since) countQuery = countQuery.gte("created_at", params.since);
  if (params.until) countQuery = countQuery.lte("created_at", params.until);
  const { count } = await countQuery;

  // Data
  let query = supabase
    .from("deals")
    .select(
      "id, title, status, value, expected_close_date, stage_id, contact_id, company_id, pipeline_id, source, created_at, updated_at, pipeline_stages(name), contacts(first_name, last_name, email), companies(name)"
    )
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
