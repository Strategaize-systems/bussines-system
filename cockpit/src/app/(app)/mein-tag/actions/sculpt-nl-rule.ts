"use server";

// V7.5 SLC-753 MT-1 — Server-Action `sculptNlRule()` fuer NL-Rule-Builder-Card.
//
// Per `feedback_use_server_value_export_forbidden`: aus diesem `"use server"`-File
// werden ausschliesslich async functions exportiert (keine Const-Arrays, Enums,
// Type-Guards). Result-Type stammt aus sculptor.ts.
//
// Flow:
//   1. assertNotReadOnlyContext (V7 Drilldown-Block + V7.5 Middleware-Mitigation).
//   2. assertCanSculpt — getProfile() + role-in ["admin","teamlead"] sonst RoleForbidden.
//   3. NL-Input aus FormData validieren (min 5 Zeichen).
//   4. sculptRule(nlInput, profile.user_id) aus SLC-752.
//
// Reuse-Trail:
//   - lib/automation/sculptor.ts sculptRule (SLC-752 MT-6)
//   - lib/auth/get-profile.ts getProfile (SLC-701)
//   - lib/auth/read-only-context.ts assertNotReadOnlyContext (SLC-706 + SLC-751)

import { getProfile } from "@/lib/auth/get-profile";
import { assertNotReadOnlyContext } from "@/lib/auth/read-only-context";
import { sculptRule, type SculptResult } from "@/lib/automation/sculptor";

const NL_INPUT_MIN_LEN = 5;
const NL_INPUT_MAX_LEN = 2000;

export type SculptNlRuleResult =
  | { ok: true; result: SculptResult }
  | { ok: false; error: "forbidden" | "input_too_short" | "input_too_long" | "infra"; message: string };

export async function sculptNlRule(formData: FormData): Promise<SculptNlRuleResult> {
  await assertNotReadOnlyContext();

  const profile = await getProfile();
  if (profile.role !== "admin" && profile.role !== "teamlead") {
    return {
      ok: false,
      error: "forbidden",
      message: "Nur Admin oder Teamlead darf den NL-Rule-Builder verwenden.",
    };
  }

  const raw = formData.get("nlInput");
  const nlInput = typeof raw === "string" ? raw.trim() : "";
  if (nlInput.length < NL_INPUT_MIN_LEN) {
    return {
      ok: false,
      error: "input_too_short",
      message: `Bitte beschreibe die Regel mit mindestens ${NL_INPUT_MIN_LEN} Zeichen.`,
    };
  }
  if (nlInput.length > NL_INPUT_MAX_LEN) {
    return {
      ok: false,
      error: "input_too_long",
      message: `Eingabe ist zu lang (max ${NL_INPUT_MAX_LEN} Zeichen).`,
    };
  }

  try {
    const result = await sculptRule(nlInput, profile.user_id);
    return { ok: true, result };
  } catch (e) {
    return {
      ok: false,
      error: "infra",
      message: `Sculptor-Aufruf fehlgeschlagen: ${(e as Error).message}`,
    };
  }
}
