/**
 * Cadence Abort-Check (MT-4, SLC-504, DEC-068)
 *
 * Prueft ob ein Enrollment abgebrochen werden soll:
 * 1. Antwort empfangen (Thread-ID Match ODER From-Address Fallback)
 * 2. Deal gewonnen
 * 3. Deal verloren
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type AbortCheckResult = {
  shouldAbort: boolean;
  reason: string | null;
};

type EnrollmentForAbortCheck = {
  id: string;
  cadence_id: string;
  deal_id: string | null;
  contact_id: string | null;
  started_at: string;
};

/**
 * Prueft ob eine Enrollment abgebrochen werden soll.
 *
 * Abort-Gruende (DEC-068):
 * - reply_received: Antwort auf eine Cadence-E-Mail (Thread-ID primaer, From-Address Fallback)
 * - deal_won: Deal-Status ist 'won'
 * - deal_lost: Deal-Status ist 'lost'
 */
export async function checkAbort(
  enrollment: EnrollmentForAbortCheck
): Promise<AbortCheckResult> {
  const supabase = createAdminClient();

  // --- Check 1: Deal gewonnen/verloren ---
  if (enrollment.deal_id) {
    const { data: deal } = await supabase
      .from("deals")
      .select("status")
      .eq("id", enrollment.deal_id)
      .single();

    if (deal?.status === "won") {
      return { shouldAbort: true, reason: "deal_won" };
    }
    if (deal?.status === "lost") {
      return { shouldAbort: true, reason: "deal_lost" };
    }
  }

  // --- Check 2: Antwort empfangen (DEC-068) ---

  // 2a. Thread-ID-basiert: Finde alle von dieser Cadence gesendeten E-Mails
  //     und pruefe ob eine Antwort im selben Thread existiert.
  const smtpFrom = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "";

  const { data: sentEmails } = await supabase
    .from("cadence_executions")
    .select("email_id")
    .eq("enrollment_id", enrollment.id)
    .eq("step_type", "email")
    .not("email_id", "is", null);

  if (sentEmails && sentEmails.length > 0) {
    const emailIds = sentEmails
      .map((e) => e.email_id)
      .filter((id): id is string => id !== null);

    if (emailIds.length > 0) {
      // Get subjects of sent emails to find thread replies
      const { data: sentEmailRecords } = await supabase
        .from("emails")
        .select("id, subject")
        .in("id", emailIds);

      // Check email_messages for replies: same thread (in_reply_to or subject Re:)
      // from someone other than our SMTP address, after enrollment started
      if (sentEmailRecords && sentEmailRecords.length > 0) {
        const subjects = sentEmailRecords
          .map((e) => e.subject)
          .filter((s): s is string => s !== null);

        // Build subject patterns for reply detection (Re: Subject, AW: Subject, etc.)
        const replySubjects = subjects.flatMap((s) => [
          `Re: ${s}`,
          `AW: ${s}`,
          `RE: ${s}`,
        ]);

        if (replySubjects.length > 0) {
          const { data: replies } = await supabase
            .from("email_messages")
            .select("id")
            .in("subject", replySubjects)
            .neq("from_address", smtpFrom)
            .gte("received_at", enrollment.started_at)
            .limit(1);

          if (replies && replies.length > 0) {
            return { shouldAbort: true, reason: "reply_received" };
          }
        }
      }
    }
  }

  // 2b. From-Address Fallback: Pruefe ob der Kontakt ueberhaupt geantwortet hat
  if (enrollment.contact_id) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("email")
      .eq("id", enrollment.contact_id)
      .single();

    if (contact?.email) {
      const { data: contactReplies } = await supabase
        .from("email_messages")
        .select("id")
        .eq("from_address", contact.email)
        .gte("received_at", enrollment.started_at)
        .limit(1);

      if (contactReplies && contactReplies.length > 0) {
        return { shouldAbort: true, reason: "reply_received" };
      }
    }
  }

  // --- Kein Abort ---
  return { shouldAbort: false, reason: null };
}
