"use server";

// V7.6 SLC-762 MT-2 — saveCustomReport Server-Action.
//
// Flow:
//   1. assertNotReadOnlyContext (V7 Drilldown-Block).
//   2. getProfile() — eingeloggter User (kein role-Gate, Owner-Scope via RLS).
//   3. zod-Validate Input (Length/Whitelist).
//   4. INSERT public.custom_reports mit owner_user_id = profile.user_id.
//   5. UNIQUE-Violation 23505 → { ok:false, code:"duplicate_name" }.
//   6. audit_log INSERT 'custom_report.created' (best-effort).
//
// Pattern-Reuse:
//   - apply-nl-rule.ts (V7.5 SLC-754): INSERT + audit_log + try/catch-Pattern.
//   - sculptor.ts insertAttempt: best-effort audit (never block return).
//   - feedback_use_server_value_export_forbidden: nur async functions exportiert.

import { getProfile } from "@/lib/auth/get-profile";
import { assertNotReadOnlyContext } from "@/lib/auth/read-only-context";
import { createClient } from "@/lib/supabase/server";
import {
  SaveCustomReportSchema,
  UNIQUE_VIOLATION,
} from "@/lib/custom-reports/schema";
import type {
  SaveCustomReportInput,
  SaveCustomReportResult,
} from "@/lib/custom-reports/types";

export async function saveCustomReport(
  input: SaveCustomReportInput
): Promise<SaveCustomReportResult> {
  await assertNotReadOnlyContext();

  const profile = await getProfile();

  const parsed = SaveCustomReportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      message: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const data = parsed.data;

  const supabase = await createClient();

  const { data: inserted, error: insErr } = await supabase
    .from("custom_reports")
    .insert({
      owner_user_id: profile.user_id,
      context_type: data.context_type,
      name: data.name,
      prompt_template: data.prompt_template,
      description: data.description ?? null,
    })
    .select("id")
    .single();

  if (insErr) {
    if (
      insErr.code === UNIQUE_VIOLATION ||
      insErr.message?.includes("duplicate key value violates unique constraint")
    ) {
      return {
        ok: false,
        code: "duplicate_name",
        message: `Du hast bereits einen Custom-Report mit dem Namen "${data.name}".`,
      };
    }
    return {
      ok: false,
      code: "infra",
      message: `Custom-Report Insert fehlgeschlagen: ${insErr.message}`,
    };
  }

  if (!inserted) {
    return {
      ok: false,
      code: "infra",
      message: "Custom-Report Insert lieferte keine Zeile zurueck.",
    };
  }

  const newId = (inserted as { id: string }).id;

  // Best-effort audit-Insert (Save-Flow darf nicht an Audit-Insert sterben).
  try {
    await supabase.from("audit_log").insert({
      actor_id: profile.user_id,
      action: "custom_report.created",
      entity_type: "custom_report",
      entity_id: newId,
      changes: null,
      context: JSON.stringify({
        name: data.name,
        context_type: data.context_type,
      }),
    });
  } catch {
    // intentional best-effort
  }

  return { ok: true, id: newId };
}
