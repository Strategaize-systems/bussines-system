"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ── Types ──────────────────────────────────────────────────────

export type MeetingAgendaMode = "auto" | "on_click" | "off";

export interface UserSettings {
  user_id: string;
  meeting_reminder_external_hours: number[];
  meeting_reminder_internal_enabled: boolean;
  meeting_reminder_internal_minutes: number;
  meeting_agenda_mode: MeetingAgendaMode;
  push_subscription: unknown;
  created_at: string;
  updated_at: string;
}

export interface SaveUserSettingsInput {
  meeting_reminder_external_hours: number[];
  meeting_reminder_internal_enabled: boolean;
  meeting_reminder_internal_minutes: number;
  meeting_agenda_mode: MeetingAgendaMode;
}

// ── Validation ─────────────────────────────────────────────────

const VALID_AGENDA_MODES: MeetingAgendaMode[] = ["auto", "on_click", "off"];

function validateSettings(
  input: SaveUserSettingsInput
): { valid: true } | { valid: false; error: string } {
  // Hours: array of integers 0-168 (0 = at start, 168 = 7 days)
  if (!Array.isArray(input.meeting_reminder_external_hours)) {
    return { valid: false, error: "meeting_reminder_external_hours muss ein Array sein" };
  }
  for (const h of input.meeting_reminder_external_hours) {
    if (!Number.isInteger(h) || h < 0 || h > 168) {
      return { valid: false, error: `Ungültiger Reminder-Wert: ${h} (erlaubt: 0-168)` };
    }
  }
  if (input.meeting_reminder_external_hours.length > 10) {
    return { valid: false, error: "Maximal 10 Reminder-Zeitpunkte erlaubt" };
  }

  // Internal minutes: positive integer
  if (
    !Number.isInteger(input.meeting_reminder_internal_minutes) ||
    input.meeting_reminder_internal_minutes < 1 ||
    input.meeting_reminder_internal_minutes > 1440
  ) {
    return { valid: false, error: "meeting_reminder_internal_minutes muss 1-1440 sein" };
  }

  // Boolean check
  if (typeof input.meeting_reminder_internal_enabled !== "boolean") {
    return { valid: false, error: "meeting_reminder_internal_enabled muss boolean sein" };
  }

  // Agenda mode enum
  if (!VALID_AGENDA_MODES.includes(input.meeting_agenda_mode)) {
    return { valid: false, error: `Ungültiger Agenda-Modus: ${input.meeting_agenda_mode}` };
  }

  return { valid: true };
}

// ── Queries ────────────────────────────────────────────────────

export async function getUserSettings(): Promise<UserSettings | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    // Row might not exist yet — return defaults
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(error.message);
  }

  return data as UserSettings;
}

// ── Mutations ──────────────────────────────────────────────────

export async function saveUserSettings(
  input: SaveUserSettingsInput
): Promise<{ error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht authentifiziert" };

  const validation = validateSettings(input);
  if (!validation.valid) return { error: validation.error };

  // Sort hours descending for consistent display (e.g. [24, 2])
  const sortedHours = [...input.meeting_reminder_external_hours].sort(
    (a, b) => b - a
  );

  const { error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: user.id,
        meeting_reminder_external_hours: sortedHours,
        meeting_reminder_internal_enabled: input.meeting_reminder_internal_enabled,
        meeting_reminder_internal_minutes: input.meeting_reminder_internal_minutes,
        meeting_agenda_mode: input.meeting_agenda_mode,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/settings/meetings");
  return { error: "" };
}
