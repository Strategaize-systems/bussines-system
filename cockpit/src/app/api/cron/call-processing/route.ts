import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { verifyCronSecret } from "../verify-cron-secret";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  uploadCallRecording,
  getWavDurationSeconds,
} from "@/lib/storage/call-recordings";
import { getTranscriptionProvider } from "@/lib/ai/transcription";
import { withRetry, isRetryableError } from "@/lib/ai/retry";
import { queryLLM } from "@/lib/ai/bedrock-client";
import {
  CALL_SUMMARY_SYSTEM_PROMPT,
  buildCallSummaryPrompt,
  parseCallSummary,
  type CallSummaryContext,
} from "@/lib/ai/prompts/call-summary";

export const maxDuration = 300;

const MAX_CONCURRENT = 1;
const RECORDINGS_DIR = process.env.ASTERISK_RECORDINGS_DIR || "/recordings-calls";

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const admin = createAdminClient();
  const processed: string[] = [];
  const errors: string[] = [];
  const skipped: string[] = [];

  try {
    // Find completed calls that still need processing.
    // Trigger = no recording_url yet AND call is finished (ended_at set).
    // Exclude SMAO/voice-agent calls — they run their own pipeline and never
    // produce an Asterisk WAV at /recordings-calls/{id}.wav (ISSUE-041).
    const { data: calls, error: queryError } = await admin
      .from("calls")
      .select(
        "id, deal_id, contact_id, phone_number, direction, started_at, ended_at, duration_seconds, recording_status, transcript_status, summary_status, recording_url, transcript",
      )
      .is("recording_url", null)
      .eq("status", "completed")
      .eq("voice_agent_handled", false)
      .not("ended_at", "is", null)
      .order("ended_at", { ascending: true })
      .limit(MAX_CONCURRENT);

    if (queryError) {
      return NextResponse.json(
        { success: false, error: queryError.message },
        { status: 500 },
      );
    }

    if (!calls || calls.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No calls pending processing",
        processed,
        errors,
        skipped,
      });
    }

    for (const call of calls) {
      const wavPath = path.join(RECORDINGS_DIR, `${call.id}.wav`);

      try {
        // 2a. WAV file must exist on shared volume
        if (!fs.existsSync(wavPath)) {
          skipped.push(`${call.id}: WAV not yet available (${wavPath})`);
          continue;
        }

        // 2b. Upload WAV to Supabase Storage
        await admin
          .from("calls")
          .update({ recording_status: "uploading" })
          .eq("id", call.id);

        const buffer = fs.readFileSync(wavPath);
        // Reject WAVs with header-only or near-empty payload (<1 KB = ~60ms
        // PCM 8 kHz mono). These occur when a call is hung up before audio flows.
        // Whisper would reject them anyway — fail fast with a clear message.
        if (buffer.length < 1000) {
          throw new Error(
            `WAV file has no usable audio: ${buffer.length} bytes`,
          );
        }

        console.log(
          `[Cron/CallProcessing] Uploading ${(buffer.length / 1024 / 1024).toFixed(2)} MB for call ${call.id}`,
        );

        const uploadResult = await uploadCallRecording(
          call.id,
          `${call.id}.wav`,
          buffer,
        );

        if ("error" in uploadResult) {
          throw new Error(uploadResult.error);
        }

        // Parse duration from WAV header (overrides any imprecise client-side value)
        const wavDuration = getWavDurationSeconds(buffer);

        await admin
          .from("calls")
          .update({
            recording_url: uploadResult.path,
            recording_status: "completed",
            ...(wavDuration ? { duration_seconds: wavDuration } : {}),
          })
          .eq("id", call.id);

        // 2c. Whisper transcription
        if (
          call.transcript_status !== "completed" &&
          call.transcript_status !== "processing"
        ) {
          await admin
            .from("calls")
            .update({ transcript_status: "processing" })
            .eq("id", call.id);
        }

        console.log(`[Cron/CallProcessing] Starting Whisper for call ${call.id}`);

        const provider = getTranscriptionProvider();
        const transcriptResult = await withRetry(
          async () => {
            const r = await provider.transcribe(buffer, `${call.id}.wav`, {
              language: "de",
              responseFormat: "verbose_json",
            });
            if (!r.success || !r.text) {
              throw new Error(r.error || "Transcription returned no text");
            }
            return r;
          },
          isRetryableError,
        );

        const transcriptText = transcriptResult.text!;

        await admin
          .from("calls")
          .update({
            transcript: transcriptText,
            transcript_status: "completed",
          })
          .eq("id", call.id);

        console.log(
          `[Cron/CallProcessing] Transcript done: ${transcriptText.length} chars`,
        );

        // 2d. Bedrock Call-Summary
        await admin
          .from("calls")
          .update({ summary_status: "processing" })
          .eq("id", call.id);

        const summaryContext = await buildCallContext(admin, call, transcriptText);
        const prompt = buildCallSummaryPrompt(summaryContext);

        const llmResult = await withRetry(
          async () => {
            const r = await queryLLM(prompt, CALL_SUMMARY_SYSTEM_PROMPT, {
              temperature: 0.2,
              maxTokens: 1200,
              timeoutMs: 60_000,
            });
            if (!r.success || !r.data) {
              throw new Error(r.error || "Bedrock returned no data");
            }
            return r;
          },
          isRetryableError,
        );

        const summary = parseCallSummary(llmResult.data!);
        if (!summary) {
          throw new Error(
            "Bedrock output failed Zod validation — raw: " +
              llmResult.data!.substring(0, 200),
          );
        }

        await admin
          .from("calls")
          .update({
            ai_summary: summary,
            summary_status: "completed",
          })
          .eq("id", call.id);

        // 2e. Upsert Call-Activity in timeline
        if (call.deal_id) {
          const { data: existingActivity } = await admin
            .from("activities")
            .select("id")
            .eq("source_type", "call")
            .eq("source_id", call.id)
            .maybeSingle();

          const durationText = call.duration_seconds
            ? `${Math.floor(call.duration_seconds / 60)}:${String(
                call.duration_seconds % 60,
              ).padStart(2, "0")} min`
            : null;
          const title = [
            call.direction === "outbound" ? "Ausgehender Anruf" : "Eingehender Anruf",
            durationText,
          ]
            .filter(Boolean)
            .join(" · ");

          if (existingActivity) {
            await admin
              .from("activities")
              .update({
                title,
                description: summary.outcome,
                ai_generated: true,
              })
              .eq("id", existingActivity.id);
          } else {
            await admin.from("activities").insert({
              type: "call",
              title,
              description: summary.outcome,
              deal_id: call.deal_id,
              contact_id: call.contact_id,
              source_type: "call",
              source_id: call.id,
              ai_generated: true,
            });
          }
        }

        // Audit log
        await admin.from("audit_log").insert({
          actor_id: null,
          action: "call_processed",
          entity_type: "call",
          entity_id: call.id,
          changes: {
            after: {
              event: "call_pipeline_completed",
              recording_path: uploadResult.path,
              duration_seconds: wavDuration ?? call.duration_seconds,
              transcript_length: transcriptText.length,
              provider: transcriptResult.provider,
              summary_outcome_length: summary.outcome.length,
            },
          },
          context: `Call-Pipeline: upload + transcript (${transcriptText.length} chars) + summary`,
        });

        processed.push(
          `${call.id}: ${transcriptText.length} chars, outcome=${summary.outcome.length} chars`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${call.id}: ${msg}`);
        console.error(
          `[Cron/CallProcessing] Failed for call ${call.id}:`,
          msg,
        );

        // Mark stage as failed (don't overwrite already-completed upstream stages)
        const { data: latest } = await admin
          .from("calls")
          .select("recording_status, transcript_status, summary_status")
          .eq("id", call.id)
          .single();

        const update: Record<string, unknown> = {};
        if (
          latest &&
          latest.recording_status !== "completed" &&
          latest.recording_status !== "deleted"
        ) {
          update.recording_status = "failed";
        } else if (
          latest &&
          latest.transcript_status !== "completed"
        ) {
          update.transcript_status = "failed";
        } else if (
          latest &&
          latest.summary_status !== "completed"
        ) {
          update.summary_status = "failed";
        }
        if (Object.keys(update).length > 0) {
          await admin.from("calls").update(update).eq("id", call.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      errors,
      skipped,
    });
  } catch (err) {
    console.error("[Cron/CallProcessing] Fatal error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// ── Helper: Build call context for summary prompt ──────────────────

async function buildCallContext(
  admin: ReturnType<typeof createAdminClient>,
  call: {
    id: string;
    deal_id: string | null;
    contact_id: string | null;
    phone_number: string | null;
    direction: string;
    duration_seconds: number | null;
  },
  transcript: string,
): Promise<CallSummaryContext> {
  const context: CallSummaryContext = {
    transcript,
    direction: call.direction === "inbound" ? "inbound" : "outbound",
    durationSeconds: call.duration_seconds ?? undefined,
  };

  if (call.deal_id) {
    const { data: deal } = await admin
      .from("deals")
      .select("title")
      .eq("id", call.deal_id)
      .maybeSingle();
    if (deal?.title) context.dealName = deal.title;
  }

  if (call.contact_id) {
    const { data: contact } = await admin
      .from("contacts")
      .select("first_name, last_name, companies(name)")
      .eq("id", call.contact_id)
      .maybeSingle();
    if (contact) {
      const c = contact as any;
      const name = `${c.first_name || ""} ${c.last_name || ""}`.trim();
      if (name) {
        context.contactName = name;
        const company = c.companies?.name;
        if (company) context.contactCompany = company;
      }
    }
  }

  if (call.deal_id) {
    const fourteenDaysAgo = new Date(
      Date.now() - 14 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data: activities } = await admin
      .from("activities")
      .select("type, title, created_at")
      .eq("deal_id", call.deal_id)
      .neq("source_id", call.id)
      .gte("created_at", fourteenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(8);
    if (activities && activities.length > 0) {
      context.recentActivities = activities.map((a: any) => ({
        type: a.type,
        title: a.title || "(ohne Titel)",
        date: new Date(a.created_at).toLocaleDateString("de-DE"),
      }));
    }
  }

  return context;
}
