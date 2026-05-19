"use server";

// V7.6 SLC-762 MT-4 — renameCustomReport Server-Action.
//
// Flow:
//   1. assertNotReadOnlyContext.
//   2. getProfile (kein role-Gate, Owner-Scope via RLS).
//   3. zod-Validate (id uuid, name 2-80).
//   4. Pre-SELECT um old_name fuer audit_log zu kennen + RLS-Filter zu pruefen.
//   5. UPDATE name + updated_at WHERE id=$1 (RLS-implicit).
//   6. UNIQUE-23505 -> { ok:false, code:"duplicate_name" }.
//   7. audit_log INSERT 'custom_report.renamed' (best-effort).
//
// Pattern-Reuse: save.ts (UNIQUE-Mapping), apply-nl-rule.ts (audit-best-effort).

import { getProfile } from "@/lib/auth/get-profile";
import { assertNotReadOnlyContext } from "@/lib/auth/read-only-context";
import { createClient } from "@/lib/supabase/server";
import {
  RenameCustomReportSchema,
  UNIQUE_VIOLATION,
} from "@/lib/custom-reports/schema";
import type {
  RenameCustomReportInput,
  RenameCustomReportResult,
} from "@/lib/custom-reports/types";

export async function renameCustomReport(
  input: RenameCustomReportInput
): Promise<RenameCustomReportResult> {
  await assertNotReadOnlyContext();

  const profile = await getProfile();

  const parsed = RenameCustomReportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      message: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const { id, name: newName } = parsed.data;

  const supabase = await createClient();

  // Pre-SELECT (RLS-implicit): liefert null wenn nicht Owner.
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
  const oldName = (existing as { name: string }).name;

  const { error: updErr } = await supabase
    .from("custom_reports")
    .update({ name: newName, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updErr) {
    if (
      updErr.code === UNIQUE_VIOLATION ||
      updErr.message?.includes("duplicate key value violates unique constraint")
    ) {
      return {
        ok: false,
        code: "duplicate_name",
        message: `Du hast bereits einen Custom-Report mit dem Namen "${newName}".`,
      };
    }
    return {
      ok: false,
      code: "infra",
      message: `Custom-Report Rename fehlgeschlagen: ${updErr.message}`,
    };
  }

  // Best-effort audit-Insert.
  try {
    await supabase.from("audit_log").insert({
      actor_id: profile.user_id,
      action: "custom_report.renamed",
      entity_type: "custom_report",
      entity_id: id,
      changes: null,
      context: JSON.stringify({ old_name: oldName, new_name: newName }),
    });
  } catch {
    // intentional best-effort
  }

  return { ok: true };
}
