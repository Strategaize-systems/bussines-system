// =============================================================
// V5.6 SLC-564 — Pre-Call Briefing Cron (POST /api/cron/meeting-briefing)
// =============================================================
//
// Runs every 5 minutes via Coolify-Cron. For each upcoming meeting with a
// deal_id whose start falls inside the user's configured trigger window
// (15/30/45/60 min — DEC-117), generates a briefing via the existing
// FEAT-301 prompt+validator stack, persists it as activities(type='briefing')
// (DEC-119), and delivers via Push (FEAT-409) and/or Email (V5.3 stack).
//
// Idempotency (DEC-118): UPDATE meetings SET briefing_generated_at=now()
// WHERE id=$1 AND briefing_generated_at IS NULL — Winner-Takes-All. A second
// concurrent run gets 0 rows and skips.
//
// Sentinel-Strategy: on Bedrock or validation failure the marker is reset
// (re-arm) and a 'briefing_error' activity is logged. After
// MAX_BRIEFING_RETRIES failures the marker stays set (no further retries).

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "../verify-cron-secret";
import { createAdminClient } from "@/lib/supabase/admin";
import { queryLLM } from "@/lib/ai/bedrock-client";
import {
  buildDealBriefingPrompt,
  DEAL_BRIEFING_SYSTEM_PROMPT,
} from "@/lib/ai/prompts/deal-briefing";
import { parseLLMResponse, validateDealBriefing } from "@/lib/ai/parser";
import { loadDealBriefingContext } from "@/lib/ai/deal-context-loader";
import { sendPushNotification } from "@/lib/push/send";
import { renderBriefingEmail } from "@/lib/email/templates/briefing-html";
import { MAX_BRIEFING_RETRIES } from "@/lib/types/briefing";
import nodemailer from "nodemailer";

export const maxDuration = 60;

interface MeetingRow {
  id: string;
  title: string | null;
  scheduled_at: string;
  deal_id: string | null;
  created_by: string | null;
  briefing_generated_at: string | null;
}

interface UserSettingsRow {
  user_id: string;
  briefing_trigger_minutes: number | null;
  briefing_push_enabled: boolean | null;
  briefing_email_enabled: boolean | null;
}

function makeMailer() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM_EMAIL || user;
  if (!host || !user || !pass || !from) return null;
  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    }),
    from,
  };
}

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const admin = createAdminClient();
  const now = new Date();

  let processedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  let retryCount = 0;
  let triggerMinutes = 30;
  let pushEnabled = true;
  let emailEnabled = true;

  try {
    // ── 1. Settings (single-user system: pick first row) ─────────
    const { data: settingsRow } = await admin
      .from("user_settings")
      .select(
        "user_id, briefing_trigger_minutes, briefing_push_enabled, briefing_email_enabled"
      )
      .limit(1)
      .maybeSingle<UserSettingsRow>();

    if (!settingsRow) {
      console.log("[Cron/MeetingBriefing] No user_settings row — skipping");
      return NextResponse.json({ success: true, skipped: "no_settings" });
    }

    triggerMinutes = settingsRow.briefing_trigger_minutes ?? 30;
    pushEnabled = settingsRow.briefing_push_enabled ?? true;
    emailEnabled = settingsRow.briefing_email_enabled ?? true;

    if (!pushEnabled && !emailEnabled) {
      console.log("[Cron/MeetingBriefing] Both channels off — skipping");
      return NextResponse.json({
        success: true,
        skipped: "all-channels-off",
      });
    }

    // ── 2. Candidate meetings ──────────────────────────────────────
    // 5-min cron tick + trigger window: scheduled_at in (now, now + window+5min].
    const windowEnd = new Date(now.getTime() + (triggerMinutes + 5) * 60_000);

    const { data: meetings, error: mErr } = await admin
      .from("meetings")
      .select("id, title, scheduled_at, deal_id, created_by, briefing_generated_at")
      .is("briefing_generated_at", null)
      .not("deal_id", "is", null)
      .gte("scheduled_at", now.toISOString())
      .lte("scheduled_at", windowEnd.toISOString())
      .order("scheduled_at", { ascending: true })
      .returns<MeetingRow[]>();

    if (mErr) {
      console.error("[Cron/MeetingBriefing] Query error:", mErr);
      return NextResponse.json({ error: mErr.message }, { status: 500 });
    }

    if (!meetings || meetings.length === 0) {
      console.log("[Cron/MeetingBriefing] No candidates");
      return NextResponse.json({
        success: true,
        processedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        retryCount: 0,
      });
    }

    // ── 3. Sequential per-meeting loop ─────────────────────────────
    const mailer = makeMailer();

    for (const meeting of meetings) {
      // 3a. Idempotent marker UPDATE-WHERE-NULL — Winner-Takes-All.
      const { data: locked, error: lockErr } = await admin
        .from("meetings")
        .update({ briefing_generated_at: new Date().toISOString() })
        .eq("id", meeting.id)
        .is("briefing_generated_at", null)
        .select("id")
        .maybeSingle();

      if (lockErr) {
        console.error(
          `[Cron/MeetingBriefing] Lock failed for ${meeting.id}:`,
          lockErr
        );
        skippedCount++;
        continue;
      }
      if (!locked) {
        // Concurrent winner — already processed this tick.
        skippedCount++;
        continue;
      }

      try {
        if (!meeting.deal_id) {
          throw new Error("deal_id missing — partial-index should have filtered");
        }

        // 3b. Build context
        const context = await loadDealBriefingContext(meeting.deal_id, admin);
        if (!context) {
          throw new Error(`Deal ${meeting.deal_id} not found`);
        }

        // 3c. Bedrock
        const llmRes = await queryLLM(
          buildDealBriefingPrompt(context),
          DEAL_BRIEFING_SYSTEM_PROMPT,
          { temperature: 0.3, maxTokens: 1500, timeoutMs: 30_000 }
        );
        if (!llmRes.success || !llmRes.data) {
          throw new Error(`LLM failed: ${llmRes.error ?? "unknown"}`);
        }

        // 3d. Parse + validate
        const parsed = parseLLMResponse(llmRes.data, validateDealBriefing);
        if (!parsed.success || !parsed.data) {
          throw new Error(`Validation failed: ${parsed.error ?? "unknown"}`);
        }
        const briefing = parsed.data;

        // 3e. Persist activity
        const { data: activity, error: insErr } = await admin
          .from("activities")
          .insert({
            type: "briefing",
            title: `Pre-Call Briefing: ${meeting.title ?? "Meeting"}`,
            description: JSON.stringify({
              meetingId: meeting.id,
              ...briefing,
            }),
            deal_id: meeting.deal_id,
            created_by: null,
          })
          .select("id")
          .single();

        if (insErr || !activity) {
          throw new Error(
            `Activity insert failed: ${insErr?.message ?? "no row"}`
          );
        }

        // 3f. Push
        if (pushEnabled && meeting.created_by) {
          try {
            const snippet =
              briefing.summary.length > 150
                ? `${briefing.summary.slice(0, 147)}...`
                : briefing.summary;
            await sendPushNotification(meeting.created_by, {
              title: `Briefing: ${meeting.title ?? "Meeting"}`,
              body: snippet,
              tag: `briefing-${meeting.id}`,
              url: `/deals/${meeting.deal_id}`,
            });
          } catch (e) {
            console.error(
              `[Cron/MeetingBriefing] Push failed for ${meeting.id}:`,
              e instanceof Error ? e.message : e
            );
          }
        }

        // 3g. Email
        if (emailEnabled && mailer && meeting.created_by) {
          try {
            const { data: { user: hostUser } } = await admin.auth.admin.getUserById(
              meeting.created_by
            );
            const recipient = hostUser?.email;
            if (recipient) {
              const baseUrl =
                (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "") ||
                "https://business.strategaizetransition.com";

              const rendered = renderBriefingEmail({
                meetingTitle: meeting.title ?? "Meeting",
                meetingScheduledAt: new Date(meeting.scheduled_at),
                dealName: context.deal.name,
                dealId: meeting.deal_id,
                briefing,
                baseUrl,
              });

              await mailer.transporter.sendMail({
                from: mailer.from,
                to: recipient,
                subject: rendered.subject,
                text: rendered.text,
                html: rendered.html,
              });
            }
          } catch (e) {
            console.error(
              `[Cron/MeetingBriefing] Email failed for ${meeting.id}:`,
              e instanceof Error ? e.message : e
            );
          }
        }

        // 3h. Audit log (success)
        await admin.from("audit_log").insert({
          actor_id: null,
          action: "ai_briefing_generated",
          entity_type: "meeting",
          entity_id: meeting.id,
          changes: {
            briefing_activity_id: activity.id,
            push_sent: pushEnabled && !!meeting.created_by,
            email_sent: emailEnabled && !!meeting.created_by,
            confidence: briefing.confidence,
          },
          context: "Pre-Call Briefing automatisch generiert (Cron)",
        });

        processedCount++;
      } catch (err) {
        // ── Sentinel-Strategy ──────────────────────────────────────
        const message = err instanceof Error ? err.message : String(err);
        console.error(
          `[Cron/MeetingBriefing] Failure for meeting ${meeting.id}:`,
          message
        );

        // Count prior failures for this meeting
        const { count: priorFailures } = await admin
          .from("activities")
          .select("id", { count: "exact", head: true })
          .eq("type", "briefing_error")
          .eq("deal_id", meeting.deal_id ?? "00000000-0000-0000-0000-000000000000")
          .like("description", `%"meetingId":"${meeting.id}"%`);

        const failureNum = (priorFailures ?? 0) + 1;
        const finalFailure = failureNum >= MAX_BRIEFING_RETRIES;

        // Always log the failure activity.
        await admin.from("activities").insert({
          type: "briefing_error",
          title: `Briefing-Generierung fehlgeschlagen (${failureNum}/${MAX_BRIEFING_RETRIES})`,
          description: JSON.stringify({
            meetingId: meeting.id,
            error: message,
            attempt: failureNum,
            finalFailure,
          }),
          deal_id: meeting.deal_id,
          created_by: null,
        });

        if (finalFailure) {
          // Keep marker set — no more retries.
          await admin.from("audit_log").insert({
            actor_id: null,
            action: "ai_briefing_failed_permanently",
            entity_type: "meeting",
            entity_id: meeting.id,
            changes: { attempt: failureNum, error: message.slice(0, 500) },
            context: `Briefing failed permanently after ${MAX_BRIEFING_RETRIES} retries`,
          });
          failedCount++;
        } else {
          // Re-arm marker — next tick will retry.
          await admin
            .from("meetings")
            .update({ briefing_generated_at: null })
            .eq("id", meeting.id);
          await admin.from("audit_log").insert({
            actor_id: null,
            action: "ai_briefing_retry_armed",
            entity_type: "meeting",
            entity_id: meeting.id,
            changes: { attempt: failureNum, error: message.slice(0, 500) },
            context: "Briefing re-armed for retry",
          });
          retryCount++;
        }
      }
    }

    console.log(
      `[Cron/MeetingBriefing] Done. processed=${processedCount} skipped=${skippedCount} failed=${failedCount} retries=${retryCount}`
    );

    return NextResponse.json({
      success: true,
      processedCount,
      skippedCount,
      failedCount,
      retryCount,
    });
  } catch (err) {
    console.error("[Cron/MeetingBriefing] Fatal:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
