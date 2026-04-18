import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "../verify-cron-secret";
import { createAdminClient } from "@/lib/supabase/admin";
import { queryLLM } from "@/lib/ai/bedrock-client";
import { withRetry, isRetryableError } from "@/lib/ai/retry";
import {
  MEETING_SUMMARY_SYSTEM_PROMPT,
  buildMeetingSummaryPrompt,
  parseMeetingSummary,
  type MeetingSummaryContext,
} from "@/lib/ai/prompts/meeting-summary";
import { indexMeeting } from "@/lib/knowledge/indexer";

export const maxDuration = 120;

const MAX_CONCURRENT = 1;

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const admin = createAdminClient();
  const processed: string[] = [];
  const errors: string[] = [];

  try {
    // Find meetings with completed transcript but no summary yet
    const { data: meetings, error: queryError } = await admin
      .from("meetings")
      .select(
        "id, title, transcript, deal_id, contact_id, company_id",
      )
      .eq("transcript_status", "completed")
      .or("summary_status.is.null,summary_status.eq.pending")
      .not("transcript", "is", null)
      .order("created_at", { ascending: true })
      .limit(MAX_CONCURRENT);

    if (queryError) {
      return NextResponse.json(
        { success: false, error: queryError.message },
        { status: 500 },
      );
    }

    if (!meetings || meetings.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No meetings pending summary",
        processed,
        errors,
      });
    }

    for (const meeting of meetings) {
      try {
        if (!meeting.transcript) {
          errors.push(`${meeting.id}: no transcript text`);
          continue;
        }

        // Mark as processing
        await admin
          .from("meetings")
          .update({ summary_status: "processing" })
          .eq("id", meeting.id);

        console.log(
          `[Cron/Summary] Processing meeting ${meeting.id}: ${meeting.title}`,
        );

        // Build deal context (last 14 days of activities + contacts)
        const context = await buildDealContext(admin, meeting);

        // Build prompt
        const prompt = buildMeetingSummaryPrompt(context);

        console.log(
          `[Cron/Summary] Prompt token estimate: ~${Math.round(prompt.length / 4)} tokens`,
        );

        // Call Bedrock with exponential backoff
        const llmResult = await withRetry(
          async () => {
            const r = await queryLLM(prompt, MEETING_SUMMARY_SYSTEM_PROMPT, {
              temperature: 0.2,
              maxTokens: 1500,
              timeoutMs: 90_000,
            });
            if (!r.success || !r.data) {
              throw new Error(r.error || "Bedrock returned no data");
            }
            return r;
          },
          isRetryableError,
        );

        // Parse and validate with Zod
        const rawText = llmResult.data!; // guaranteed non-null by withRetry check
        const summary = parseMeetingSummary(rawText);
        if (!summary) {
          throw new Error(
            "Bedrock output failed Zod validation — raw: " +
              rawText.substring(0, 200),
          );
        }

        // Save summary
        await admin
          .from("meetings")
          .update({
            ai_summary: summary,
            summary_status: "completed",
          })
          .eq("id", meeting.id);

        // Auto-embed meeting into knowledge base (fire-and-forget)
        indexMeeting(meeting.id)
          .then((r) => console.log(`[Cron/Summary] Auto-embedded meeting ${meeting.id}: ${r.stored} chunks`))
          .catch((err) => console.error(`[Cron/Summary] Auto-embed meeting failed: ${meeting.id}`, err.message));

        // Insert Activity (idempotent: check for existing)
        if (meeting.deal_id) {
          const { data: existingActivity } = await admin
            .from("activities")
            .select("id")
            .eq("source_type", "meeting")
            .eq("source_id", meeting.id)
            .eq("ai_generated", true)
            .maybeSingle();

          if (!existingActivity) {
            await admin.from("activities").insert({
              type: "meeting",
              title: `KI-Zusammenfassung: ${meeting.title || "Meeting"}`,
              description: summary.outcome,
              deal_id: meeting.deal_id,
              contact_id: meeting.contact_id,
              company_id: meeting.company_id,
              source_type: "meeting",
              source_id: meeting.id,
              ai_generated: true,
            });
          }
        }

        // Audit log
        await admin.from("audit_log").insert({
          actor_id: null,
          action: "summary_generated",
          entity_type: "meeting",
          entity_id: meeting.id,
          changes: {
            after: {
              event: "summary_completed",
              outcome_length: summary.outcome.length,
              decisions_count: summary.decisions.length,
              action_items_count: summary.action_items.length,
              prompt_chars: prompt.length,
            },
          },
          context: `Summary generated: ${summary.decisions.length} decisions, ${summary.action_items.length} action items`,
        });

        processed.push(
          `${meeting.id} (${meeting.title}): outcome=${summary.outcome.length} chars`,
        );

        console.log(
          `[Cron/Summary] Meeting ${meeting.id} summarized: ${summary.decisions.length} decisions, ${summary.action_items.length} action items`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${meeting.id}: ${msg}`);

        await admin
          .from("meetings")
          .update({ summary_status: "failed" })
          .eq("id", meeting.id);

        console.error(
          `[Cron/Summary] Failed for meeting ${meeting.id}:`,
          msg,
        );
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      errors,
    });
  } catch (err) {
    console.error("[Cron/Summary] Fatal error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// ── Helper: Build deal context for summary prompt ──────────────

async function buildDealContext(
  admin: ReturnType<typeof createAdminClient>,
  meeting: {
    id: string;
    title: string | null;
    transcript: string;
    deal_id: string | null;
    contact_id: string | null;
    company_id: string | null;
  },
): Promise<MeetingSummaryContext> {
  const context: MeetingSummaryContext = {
    transcript: meeting.transcript,
    meetingTitle: meeting.title ?? undefined,
  };

  if (!meeting.deal_id) return context;

  // Fetch deal name
  const { data: deal } = await admin
    .from("deals")
    .select("title")
    .eq("id", meeting.deal_id)
    .maybeSingle();

  if (deal?.title) {
    context.dealName = deal.title;
  }

  // Fetch recent activities (last 14 days)
  const fourteenDaysAgo = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: activities } = await admin
    .from("activities")
    .select("type, title, created_at")
    .eq("deal_id", meeting.deal_id)
    .gte("created_at", fourteenDaysAgo)
    .order("created_at", { ascending: false })
    .limit(10);

  if (activities && activities.length > 0) {
    context.recentActivities = activities.map((a) => ({
      type: a.type,
      title: a.title || "(ohne Titel)",
      date: new Date(a.created_at).toLocaleDateString("de-DE"),
    }));
  }

  // Fetch meeting contacts
  const { data: meetingContacts } = await admin
    .from("meetings")
    .select("contact_id, contacts(first_name, last_name, company_id, companies(name))")
    .eq("id", meeting.id)
    .maybeSingle();

  if (meetingContacts?.contacts) {
    const c = meetingContacts.contacts as any;
    const contacts = Array.isArray(c) ? c : [c];
    context.contacts = contacts
      .filter((ct: any) => ct?.first_name || ct?.last_name)
      .map((ct: any) => ({
        name: `${ct.first_name || ""} ${ct.last_name || ""}`.trim(),
        company: ct.companies?.name ?? undefined,
      }));
  }

  return context;
}
