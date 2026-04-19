// =============================================================
// Signal-Extract Cron — Processes pending meetings & emails
// for deal-property signal extraction (SLC-433, MT-3)
// =============================================================
//
// Runs every 5 minutes (DEC-050). Picks up meetings and emails
// with signal_status='pending', loads deal context, calls the
// signal extractor, and updates status to completed/no_signals.
// Max 3 items per run to respect Bedrock rate limits.

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "../verify-cron-secret";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractSignals } from "@/lib/ai/signals";
import type { SignalDealContext } from "@/lib/ai/signals";

export const maxDuration = 120;

const MAX_PER_RUN = 3;

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const admin = createAdminClient();
  const stats = {
    meetingsProcessed: 0,
    emailsProcessed: 0,
    signalsCreated: 0,
    errors: [] as string[],
  };

  try {
    // ── 1. Process pending meetings ───────────────────────────

    const { data: pendingMeetings, error: meetingError } = await admin
      .from("meetings")
      .select(
        "id, title, ai_summary, deal_id, contact_id, company_id"
      )
      .eq("signal_status", "pending")
      .not("ai_summary", "is", null)
      .not("deal_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(MAX_PER_RUN);

    if (meetingError) {
      stats.errors.push(`Meeting query: ${meetingError.message}`);
    }

    for (const meeting of pendingMeetings ?? []) {
      try {
        const dealContext = await loadDealContext(admin, meeting.deal_id!);
        if (!dealContext) {
          await setMeetingSignalStatus(admin, meeting.id, "no_signals");
          stats.meetingsProcessed++;
          continue;
        }

        // Extract summary text from JSONB
        const summaryText = extractSummaryText(meeting.ai_summary);
        if (!summaryText) {
          await setMeetingSignalStatus(admin, meeting.id, "no_signals");
          stats.meetingsProcessed++;
          continue;
        }

        const results = await extractSignals(
          summaryText,
          dealContext,
          "meeting",
          meeting.id
        );

        const newStatus = results.length > 0 ? "completed" : "no_signals";
        await setMeetingSignalStatus(admin, meeting.id, newStatus);

        stats.signalsCreated += results.length;
        stats.meetingsProcessed++;

        console.log(
          `[Cron/Signal] Meeting ${meeting.id}: ${results.length} signals extracted`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        stats.errors.push(`Meeting ${meeting.id}: ${msg}`);
        // Leave status as 'pending' for retry on next run
        console.error(`[Cron/Signal] Meeting ${meeting.id} failed:`, msg);
      }
    }

    // ── 2. Process pending emails ─────────────────────────────

    const { data: pendingEmails, error: emailError } = await admin
      .from("email_messages")
      .select(
        "id, subject, body_text, deal_id, contact_id, company_id"
      )
      .eq("signal_status", "pending")
      .not("deal_id", "is", null)
      .order("received_at", { ascending: true })
      .limit(MAX_PER_RUN);

    if (emailError) {
      stats.errors.push(`Email query: ${emailError.message}`);
    }

    for (const email of pendingEmails ?? []) {
      try {
        const dealContext = await loadDealContext(admin, email.deal_id!);
        if (!dealContext) {
          await setEmailSignalStatus(admin, email.id, "no_signals");
          stats.emailsProcessed++;
          continue;
        }

        const sourceText = email.body_text || email.subject || "";
        if (!sourceText.trim()) {
          await setEmailSignalStatus(admin, email.id, "no_signals");
          stats.emailsProcessed++;
          continue;
        }

        const results = await extractSignals(
          sourceText,
          dealContext,
          "email",
          email.id
        );

        const newStatus = results.length > 0 ? "completed" : "no_signals";
        await setEmailSignalStatus(admin, email.id, newStatus);

        stats.signalsCreated += results.length;
        stats.emailsProcessed++;

        console.log(
          `[Cron/Signal] Email ${email.id}: ${results.length} signals extracted`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        stats.errors.push(`Email ${email.id}: ${msg}`);
        // Leave status as 'pending' for retry on next run
        console.error(`[Cron/Signal] Email ${email.id} failed:`, msg);
      }
    }

    // ── 3. Return stats ───────────────────────────────────────

    console.log(
      `[Cron/Signal] Done — meetings=${stats.meetingsProcessed}, emails=${stats.emailsProcessed}, signals=${stats.signalsCreated}, errors=${stats.errors.length}`
    );

    return NextResponse.json({
      success: true,
      ...stats,
    });
  } catch (err) {
    console.error("[Cron/Signal] Fatal error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────

async function loadDealContext(
  admin: ReturnType<typeof createAdminClient>,
  dealId: string
): Promise<SignalDealContext | null> {
  const { data: deal } = await admin
    .from("deals")
    .select(
      "id, title, value, status, next_action, pipeline_stages(name), contacts(first_name, last_name), companies(name)"
    )
    .eq("id", dealId)
    .maybeSingle();

  if (!deal) return null;

  // pipeline_stages FK join
  const stageRaw = deal.pipeline_stages as
    | { name: string }
    | { name: string }[]
    | null;
  const stage = Array.isArray(stageRaw) ? stageRaw[0] : stageRaw;

  // contacts FK join
  const contactRaw = deal.contacts as
    | { first_name: string | null; last_name: string | null }
    | { first_name: string | null; last_name: string | null }[]
    | null;
  const contact = Array.isArray(contactRaw) ? contactRaw[0] : contactRaw;

  // companies FK join
  const companyRaw = deal.companies as
    | { name: string }
    | { name: string }[]
    | null;
  const company = Array.isArray(companyRaw) ? companyRaw[0] : companyRaw;

  return {
    dealId: deal.id,
    dealName: deal.title || "Unbekannter Deal",
    stage: stage?.name,
    value: deal.value ?? undefined,
    status: deal.status ?? undefined,
    contactName: contact
      ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || undefined
      : undefined,
    companyName: company?.name ?? undefined,
    nextAction: deal.next_action ?? undefined,
  };
}

function extractSummaryText(
  aiSummary: unknown
): string | null {
  if (!aiSummary || typeof aiSummary !== "object") return null;

  const summary = aiSummary as Record<string, unknown>;

  // ai_summary is a JSONB with {outcome, decisions, action_items, next_step}
  const parts: string[] = [];

  if (typeof summary.outcome === "string") {
    parts.push(summary.outcome);
  }

  if (Array.isArray(summary.decisions)) {
    for (const d of summary.decisions) {
      if (typeof d === "string") parts.push(d);
    }
  }

  if (Array.isArray(summary.action_items)) {
    for (const item of summary.action_items) {
      if (typeof item === "object" && item !== null) {
        const ai = item as { task?: string; owner?: string };
        if (ai.task) parts.push(ai.task);
      }
    }
  }

  if (typeof summary.next_step === "string") {
    parts.push(summary.next_step);
  }

  return parts.length > 0 ? parts.join("\n") : null;
}

async function setMeetingSignalStatus(
  admin: ReturnType<typeof createAdminClient>,
  meetingId: string,
  status: string
): Promise<void> {
  await admin
    .from("meetings")
    .update({ signal_status: status })
    .eq("id", meetingId);
}

async function setEmailSignalStatus(
  admin: ReturnType<typeof createAdminClient>,
  emailId: string,
  status: string
): Promise<void> {
  await admin
    .from("email_messages")
    .update({ signal_status: status })
    .eq("id", emailId);
}
