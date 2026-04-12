"use server";

import { createClient } from "@/lib/supabase/server";
import type { EmailSyncState } from "@/types/email";

export async function getImapSyncStatus(): Promise<EmailSyncState | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("email_sync_state")
    .select("*")
    .eq("folder", "INBOX")
    .maybeSingle();

  return data as EmailSyncState | null;
}
