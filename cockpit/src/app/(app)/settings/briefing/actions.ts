"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type BriefingTriggerMinutes = 15 | 30 | 45 | 60;

export interface BriefingSettings {
  triggerMinutes: BriefingTriggerMinutes;
  pushEnabled: boolean;
  emailEnabled: boolean;
  hasPushSubscription: boolean;
}

export interface UpdateBriefingSettingsInput {
  triggerMinutes: BriefingTriggerMinutes;
  pushEnabled: boolean;
  emailEnabled: boolean;
}

const ALLOWED_MINUTES: BriefingTriggerMinutes[] = [15, 30, 45, 60];

async function requireUser() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Nicht authentifiziert");
  return { supabase, user: auth.user };
}

export async function getBriefingSettings(): Promise<BriefingSettings> {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("user_settings")
    .select(
      "briefing_trigger_minutes, briefing_push_enabled, briefing_email_enabled, push_subscription"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const triggerMinutes = (
    ALLOWED_MINUTES.includes(data?.briefing_trigger_minutes as BriefingTriggerMinutes)
      ? data?.briefing_trigger_minutes
      : 30
  ) as BriefingTriggerMinutes;

  return {
    triggerMinutes,
    pushEnabled: data?.briefing_push_enabled ?? true,
    emailEnabled: data?.briefing_email_enabled ?? true,
    hasPushSubscription:
      !!data?.push_subscription &&
      typeof data.push_subscription === "object" &&
      "endpoint" in (data.push_subscription as Record<string, unknown>),
  };
}

export async function updateBriefingSettings(
  input: UpdateBriefingSettingsInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!ALLOWED_MINUTES.includes(input.triggerMinutes)) {
    return {
      ok: false,
      error: `triggerMinutes muss 15/30/45/60 sein, war ${input.triggerMinutes}`,
    };
  }
  if (typeof input.pushEnabled !== "boolean") {
    return { ok: false, error: "pushEnabled muss boolean sein" };
  }
  if (typeof input.emailEnabled !== "boolean") {
    return { ok: false, error: "emailEnabled muss boolean sein" };
  }

  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      briefing_trigger_minutes: input.triggerMinutes,
      briefing_push_enabled: input.pushEnabled,
      briefing_email_enabled: input.emailEnabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings/briefing");
  return { ok: true };
}
