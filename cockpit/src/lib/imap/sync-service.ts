import { ImapFlow } from "imapflow";
import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseEmail, normalizeSubject, type ParsedEmail } from "./parser";
import { matchContact, type ContactMatch } from "./contact-matcher";
import { indexEmail } from "@/lib/knowledge/indexer";

export interface SyncResult {
  synced: number;
  skipped: number;
  errors: number;
  lastUid: number;
}

const MAX_INITIAL_SYNC = 500;
const MAX_INCREMENTAL_SYNC = 50;
const RETENTION_DAYS = parseInt(process.env.IMAP_RETENTION_DAYS || "90");

/**
 * Main IMAP sync: connects to IONOS, fetches new emails, parses, matches contacts,
 * detects threads, stores in email_messages.
 */
export async function syncEmails(): Promise<SyncResult> {
  const supabase = createAdminClient();

  // 1. Get or create sync state
  let { data: syncState } = await supabase
    .from("email_sync_state")
    .select("*")
    .eq("folder", "INBOX")
    .maybeSingle();

  const lastUid = syncState?.last_uid ?? 0;

  if (!syncState) {
    const { data } = await supabase
      .from("email_sync_state")
      .insert({ folder: "INBOX", status: "syncing", last_uid: 0 })
      .select()
      .single();
    syncState = data;
  } else {
    await supabase
      .from("email_sync_state")
      .update({ status: "syncing", updated_at: new Date().toISOString() })
      .eq("folder", "INBOX");
  }

  // 2. Connect to IMAP
  const client = new ImapFlow({
    host: process.env.IMAP_HOST!,
    port: parseInt(process.env.IMAP_PORT || "993"),
    secure: true,
    auth: {
      user: process.env.IMAP_USER!,
      pass: process.env.IMAP_PASSWORD!,
    },
    logger: false,
  });

  let synced = 0;
  let skipped = 0;
  let errors = 0;
  let newLastUid = lastUid;

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      // 3. Determine which emails to fetch
      let uids: number[];

      if (lastUid === 0) {
        // Initial sync: last 90 days, max 500
        const since = new Date(
          Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
        );
        uids = await client.search({ since }, { uid: true });
        uids = uids.slice(-MAX_INITIAL_SYNC);
      } else {
        // Incremental sync: UIDs > lastUid, max 50
        uids = await client.search(
          { uid: `${lastUid + 1}:*` },
          { uid: true }
        );
        uids = uids.filter((u) => u > lastUid);
        uids = uids.slice(0, MAX_INCREMENTAL_SYNC);
      }

      if (uids.length === 0) {
        await updateSyncState(supabase, syncState, {
          status: "idle",
          lastUid,
          synced: 0,
        });
        return { synced: 0, skipped: 0, errors: 0, lastUid };
      }

      // 4. Fetch and process emails
      const uidSet = uids.join(",");
      for await (const msg of client.fetch(
        uidSet,
        { source: true, uid: true },
        { uid: true }
      )) {
        try {
          const parsed = await parseEmail(msg.source);

          // Skip duplicates
          const { data: existing } = await supabase
            .from("email_messages")
            .select("id")
            .eq("message_id", parsed.messageId)
            .maybeSingle();

          if (existing) {
            newLastUid = Math.max(newLastUid, msg.uid);
            skipped++;
            continue;
          }

          // Match contact
          const contactMatch = await matchContact(supabase, parsed.fromAddress);

          // Find or create thread
          const threadResult = await findOrCreateThread(
            supabase,
            parsed,
            contactMatch
          );

          // Insert email
          const retentionDate = new Date(
            Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000
          );
          const { data: insertedEmail } = await supabase.from("email_messages").insert({
            message_id: parsed.messageId,
            in_reply_to: parsed.inReplyTo,
            references_header: parsed.references,
            thread_id: threadResult.threadId,
            from_address: parsed.fromAddress,
            from_name: parsed.fromName,
            to_addresses: parsed.toAddresses,
            cc_addresses: parsed.ccAddresses,
            subject: parsed.subject,
            body_text: parsed.bodyText,
            body_html: parsed.bodyHtml,
            received_at: parsed.receivedAt,
            contact_id: contactMatch?.contactId ?? null,
            company_id: contactMatch?.companyId ?? null,
            deal_id: contactMatch?.dealId ?? null,
            assignment_source: contactMatch?.source ?? null,
            attachments: parsed.attachments,
            headers_json: parsed.headersJson,
            retention_expires_at: retentionDate.toISOString(),
          }).select("id").single();

          // Auto-embed email into knowledge base (fire-and-forget)
          if (insertedEmail?.id) {
            indexEmail(insertedEmail.id)
              .then((r) => console.log(`[IMAP-Sync] Auto-embedded email ${insertedEmail.id}: ${r.stored} chunks`))
              .catch((err) => console.error(`[IMAP-Sync] Auto-embed email failed: ${insertedEmail.id}`, err.message));
          }

          // Update thread stats if existing thread
          if (!threadResult.isNew && threadResult.threadId) {
            await updateThreadStats(
              supabase,
              threadResult.threadId,
              parsed.receivedAt
            );
          }

          newLastUid = Math.max(newLastUid, msg.uid);
          synced++;
        } catch (err) {
          errors++;
          console.error(`[IMAP-Sync] UID ${msg.uid}:`, err);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    // Connection or protocol error
    await supabase
      .from("email_sync_state")
      .update({
        status: "error",
        error_message: err instanceof Error ? err.message : String(err),
        updated_at: new Date().toISOString(),
      })
      .eq("folder", "INBOX");

    return { synced, skipped, errors: errors + 1, lastUid: newLastUid };
  }

  // 5. Update sync state
  await updateSyncState(supabase, syncState, {
    status: "idle",
    lastUid: newLastUid,
    synced,
  });

  return { synced, skipped, errors, lastUid: newLastUid };
}

// ── Thread Detection ─────────────────────────────────────────────

interface ThreadResult {
  threadId: string | null;
  isNew: boolean;
}

/**
 * Find existing thread via In-Reply-To / References headers,
 * or create a new thread. Fallback: normalized subject match.
 */
async function findOrCreateThread(
  supabase: SupabaseClient,
  parsed: ParsedEmail,
  contactMatch: ContactMatch | null
): Promise<ThreadResult> {
  // 1. Try In-Reply-To header
  if (parsed.inReplyTo) {
    const { data: related } = await supabase
      .from("email_messages")
      .select("thread_id")
      .eq("message_id", parsed.inReplyTo)
      .not("thread_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (related?.thread_id) {
      return { threadId: related.thread_id, isNew: false };
    }
  }

  // 2. Try References header (check each reference)
  if (parsed.references) {
    const refs = parsed.references.split(/\s+/).filter(Boolean);
    for (const ref of refs) {
      const { data: related } = await supabase
        .from("email_messages")
        .select("thread_id")
        .eq("message_id", ref.trim())
        .not("thread_id", "is", null)
        .limit(1)
        .maybeSingle();

      if (related?.thread_id) {
        return { threadId: related.thread_id, isNew: false };
      }
    }
  }

  // 3. Fallback: normalized subject match (same contact, last 14 days)
  if (parsed.subject && contactMatch?.contactId) {
    const normalized = normalizeSubject(parsed.subject);
    if (normalized.length > 3) {
      const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const { data: subjectThread } = await supabase
        .from("email_threads")
        .select("id")
        .eq("contact_id", contactMatch.contactId)
        .gte("last_message_at", cutoff.toISOString())
        .ilike("subject", normalized)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subjectThread) {
        return { threadId: subjectThread.id, isNew: false };
      }
    }
  }

  // 4. Create new thread
  const { data: thread } = await supabase
    .from("email_threads")
    .insert({
      subject: parsed.subject
        ? normalizeSubject(parsed.subject)
        : "(kein Betreff)",
      first_message_at: parsed.receivedAt,
      last_message_at: parsed.receivedAt,
      message_count: 1,
      contact_id: contactMatch?.contactId ?? null,
      company_id: contactMatch?.companyId ?? null,
      deal_id: contactMatch?.dealId ?? null,
    })
    .select("id")
    .single();

  return { threadId: thread?.id ?? null, isNew: true };
}

/** Update thread stats after adding a message to an existing thread */
async function updateThreadStats(
  supabase: SupabaseClient,
  threadId: string,
  receivedAt: string
): Promise<void> {
  // Count messages in this thread
  const { count } = await supabase
    .from("email_messages")
    .select("id", { count: "exact", head: true })
    .eq("thread_id", threadId);

  await supabase
    .from("email_threads")
    .update({
      last_message_at: receivedAt,
      message_count: count ?? 1,
    })
    .eq("id", threadId);
}

// ── Helpers ──────────────────────────────────────────────────────

async function updateSyncState(
  supabase: SupabaseClient,
  syncState: Record<string, unknown> | null,
  update: { status: string; lastUid: number; synced: number }
): Promise<void> {
  const prevTotal =
    typeof syncState?.emails_synced_total === "number"
      ? syncState.emails_synced_total
      : 0;

  await supabase
    .from("email_sync_state")
    .update({
      status: update.status,
      last_uid: update.lastUid,
      last_sync_at: new Date().toISOString(),
      emails_synced_total: prevTotal + update.synced,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("folder", "INBOX");
}
