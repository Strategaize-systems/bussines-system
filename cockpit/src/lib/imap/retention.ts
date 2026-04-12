import { createAdminClient } from "@/lib/supabase/admin";

export interface RetentionResult {
  deleted: number;
  errors: number;
}

/**
 * Delete emails past their retention_expires_at date.
 * Runs via /api/cron/retention (daily).
 */
export async function runRetention(): Promise<RetentionResult> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Find expired emails (batch of 500)
  const { data: expired, error: fetchError } = await supabase
    .from("email_messages")
    .select("id, thread_id")
    .lt("retention_expires_at", now)
    .limit(500);

  if (fetchError || !expired?.length) {
    return { deleted: 0, errors: fetchError ? 1 : 0 };
  }

  // Delete expired emails
  const ids = expired.map((e) => e.id);
  const { error: deleteError } = await supabase
    .from("email_messages")
    .delete()
    .in("id", ids);

  if (deleteError) {
    console.error("[Retention] Delete failed:", deleteError.message);
    return { deleted: 0, errors: 1 };
  }

  // Collect affected thread IDs for stats update
  const threadIds = [
    ...new Set(expired.map((e) => e.thread_id).filter(Boolean)),
  ];

  // Update message counts for affected threads
  for (const threadId of threadIds) {
    const { count } = await supabase
      .from("email_messages")
      .select("id", { count: "exact", head: true })
      .eq("thread_id", threadId);

    if (count === 0) {
      // Delete empty thread
      await supabase.from("email_threads").delete().eq("id", threadId);
    } else {
      await supabase
        .from("email_threads")
        .update({ message_count: count })
        .eq("id", threadId);
    }
  }

  return { deleted: ids.length, errors: 0 };
}
