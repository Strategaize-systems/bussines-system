"use server";

// V7.6 SLC-762 MT-4 — deleteCustomReport Server-Action.
//
// Flow:
//   1. assertNotReadOnlyContext.
//   2. getProfile (kein role-Gate, Owner-Scope via RLS).
//   3. zod-Validate (id uuid).
//   4. Pre-SELECT um name fuer audit_log zu kennen + RLS-Filter zu pruefen.
//   5. DELETE WHERE id=$1 (RLS-implicit).
//   6. audit_log INSERT 'custom_report.deleted' (best-effort).
//
// Pattern-Reuse: rename.ts (Pre-SELECT-Pattern + RLS-not-found).

import { getProfile } from "@/lib/auth/get-profile";
import { assertNotReadOnlyContext } from "@/lib/auth/read-only-context";
import { createClient } from "@/lib/supabase/server";
import { DeleteCustomReportSchema } from "@/lib/custom-reports/schema";
import type {
  DeleteCustomReportInput,
  DeleteCustomReportResult,
} from "@/lib/custom-reports/types";

export async function deleteCustomReport(
  input: DeleteCustomReportInput
): Promise<DeleteCustomReportResult> {
  await assertNotReadOnlyContext();

  const profile = await getProfile();

  const parsed = DeleteCustomReportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "infra",
      message: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const { id } = parsed.data;

  const supabase = await createClient();

  // Pre-SELECT (RLS-implicit).
  const { data: existing, error: selErr } = await supabase
    .from("custom_reports")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (selErr) {
    return {
      ok: false,
      code: "infra",
      message: `Custom-Report Pre-Select fehlgeschlagen: ${selErr.message}`,
    };
  }
  if (!existing) {
    return {
      ok: false,
      code: "not_found",
      message: "Custom-Report nicht gefunden oder kein Zugriff.",
    };
  }
  const name = (existing as { name: string }).name;

  const { error: delErr } = await supabase
    .from("custom_reports")
    .delete()
    .eq("id", id);

  if (delErr) {
    return {
      ok: false,
      code: "infra",
      message: `Custom-Report Delete fehlgeschlagen: ${delErr.message}`,
    };
  }

  // Best-effort audit-Insert.
  try {
    await supabase.from("audit_log").insert({
      actor_id: profile.user_id,
      action: "custom_report.deleted",
      entity_type: "custom_report",
      entity_id: id,
      changes: null,
      context: JSON.stringify({ name }),
    });
  } catch {
    // intentional best-effort
  }

  return { ok: true };
}
