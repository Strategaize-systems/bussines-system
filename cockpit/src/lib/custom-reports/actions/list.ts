"use server";

// V7.6 SLC-762 MT-2 — listCustomReports Server-Action.
//
// SELECT * FROM custom_reports WHERE context_type=$1 ORDER BY
//   last_used_at DESC NULLS LAST, created_at DESC
// RLS-Owner-Filter ist implicit (`owner_user_id = auth.uid()`).
//
// Pattern-Reuse: feedback_use_server_value_export_forbidden — nur async
// functions exportiert.

import { getProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";
import { ListCustomReportsSchema } from "@/lib/custom-reports/schema";
import type {
  CustomReportRow,
  ListCustomReportsInput,
  ListCustomReportsResult,
} from "@/lib/custom-reports/types";

export async function listCustomReports(
  input: ListCustomReportsInput
): Promise<ListCustomReportsResult> {
  const profile = await getProfile();

  const parsed = ListCustomReportsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "infra",
      message: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const { context_type } = parsed.data;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("custom_reports")
    .select(
      "id, owner_user_id, context_type, name, prompt_template, description, last_used_at, usage_count, created_at, updated_at"
    )
    .eq("context_type", context_type)
    .order("last_used_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      code: "infra",
      message: `Custom-Report List fehlgeschlagen (user=${profile.user_id}): ${error.message}`,
    };
  }

  return {
    ok: true,
    items: (data ?? []) as CustomReportRow[],
  };
}
