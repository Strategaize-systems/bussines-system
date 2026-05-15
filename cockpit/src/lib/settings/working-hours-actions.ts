"use server";

// SLC-667 MT-7 — Server-Actions fuer Working-Hours-Settings.
// Schema: user_settings.working_hours_start TIME / working_hours_end TIME
// CHECK-Constraint (beide NULL oder start<end) ist in MIG-032 (SLC-665).

import { assertNotReadOnlyContext } from "@/lib/auth/read-only-context";
import { createClient } from "@/lib/supabase/server";
import { validateWorkingHours } from "./working-hours-validation";

export interface WorkingHoursSettings {
  start: string | null; // "HH:MM" or null
  end: string | null;
}

export async function getWorkingHoursSettings(): Promise<WorkingHoursSettings> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht autorisiert");

  const { data } = await supabase
    .from("user_settings")
    .select("working_hours_start, working_hours_end")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    start: normalizeTimeForUi((data as { working_hours_start?: string | null } | null)?.working_hours_start ?? null),
    end: normalizeTimeForUi((data as { working_hours_end?: string | null } | null)?.working_hours_end ?? null),
  };
}

export interface UpdateWorkingHoursInput {
  start: string | null;
  end: string | null;
}

export interface UpdateWorkingHoursResult {
  ok: boolean;
  error?: string;
}

export async function updateWorkingHoursSettings(
  input: UpdateWorkingHoursInput,
): Promise<UpdateWorkingHoursResult> {
  await assertNotReadOnlyContext();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht autorisiert" };

  const validation = validateWorkingHours(input.start, input.end);
  if (!validation.ok) return { ok: false, error: validation.error };

  const startValue = input.start ? toPostgresTime(input.start) : null;
  const endValue = input.end ? toPostgresTime(input.end) : null;

  const { error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: user.id,
        working_hours_start: startValue,
        working_hours_end: endValue,
      },
      { onConflict: "user_id" },
    );

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

function normalizeTimeForUi(value: string | null): string | null {
  if (!value) return null;
  // Postgres TIME returns "HH:MM:SS"; UI uses "HH:MM"
  return value.slice(0, 5);
}

function toPostgresTime(value: string): string {
  // Akzeptiert "HH:MM" → "HH:MM:00"
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
  return value;
}
