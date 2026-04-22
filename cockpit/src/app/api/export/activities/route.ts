import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { guardExportRequest, parseExportParams, exportResponse } from "@/lib/export/helpers";

export async function GET(request: NextRequest) {
  const guard = guardExportRequest(request);
  if (guard) return guard;

  const params = parseExportParams(request);
  const supabase = createAdminClient();
  const offset = (params.page - 1) * params.limit;

  let countQuery = supabase.from("activities").select("id", { count: "exact", head: true });
  if (params.since) countQuery = countQuery.gte("created_at", params.since);
  if (params.until) countQuery = countQuery.lte("created_at", params.until);
  const { count } = await countQuery;

  let query = supabase
    .from("activities")
    .select(
      "id, type, deal_id, contact_id, company_id, title, notes, participants, objections, opportunities, risks, next_steps, created_at"
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
