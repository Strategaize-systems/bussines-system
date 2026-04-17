// =============================================================
// Generate Meeting Agenda — POST /api/meetings/[id]/generate-agenda
// =============================================================
// On-click or re-generate endpoint. Checks user's meeting_agenda_mode,
// builds deal context, calls Bedrock, persists ai_agenda + timestamp.
// Includes cost-guard: 1 call + 1 retry on 5xx only.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { queryLLM } from "@/lib/ai/bedrock-client";
import { buildAgendaContext } from "@/lib/meetings/deal-context";
import {
  buildMeetingAgendaPrompt,
  parseMeetingAgenda,
  MEETING_AGENDA_SYSTEM_PROMPT,
} from "@/lib/ai/prompts/meeting-agenda";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── Auth ──
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  // ── Check meeting_agenda_mode ──
  const { data: settings } = await admin
    .from("user_settings")
    .select("meeting_agenda_mode")
    .eq("user_id", user.id)
    .maybeSingle();

  const mode = settings?.meeting_agenda_mode ?? "on_click";

  if (mode === "off") {
    return NextResponse.json(
      { error: "KI-Agenda ist deaktiviert. Aktivieren Sie sie in den Einstellungen." },
      { status: 400 }
    );
  }

  // ── Fetch meeting ──
  const { data: meeting } = await admin
    .from("meetings")
    .select("id, title, deal_id, contact_id, company_id, ai_agenda")
    .eq("id", id)
    .maybeSingle();

  if (!meeting) {
    return NextResponse.json({ error: "Meeting nicht gefunden" }, { status: 404 });
  }

  // ── Check if re-generate was explicitly requested ──
  const body = await request.json().catch(() => ({}));
  const forceRegenerate = body?.regenerate === true;

  // If agenda exists and not re-generating, return existing
  if (meeting.ai_agenda && !forceRegenerate) {
    return NextResponse.json({
      success: true,
      agenda: JSON.parse(meeting.ai_agenda),
      cached: true,
    });
  }

  // ── Build context ──
  const context = await buildAgendaContext(admin, meeting);

  // ── Call Bedrock (single call, 1 retry on failure) ──
  // Cost guard: queryLLM returns { success: false } on error (does not throw).
  // We do 1 call, and if it fails with a retryable error, 1 retry.
  const prompt = buildMeetingAgendaPrompt(context);
  const startTime = Date.now();

  let llmResult = await queryLLM(prompt, MEETING_AGENDA_SYSTEM_PROMPT, {
    temperature: 0.3,
    maxTokens: 1500,
    timeoutMs: 30_000,
  });

  // Single retry on 5xx/timeout (cost guard: max 2 calls total)
  if (!llmResult.success && llmResult.error) {
    const isRetryable =
      /\b5\d{2}\b/.test(llmResult.error) ||
      llmResult.error.includes("timed out") ||
      llmResult.error.includes("ThrottlingException");

    if (isRetryable) {
      console.log(`[GenerateAgenda] Retrying after error: ${llmResult.error}`);
      llmResult = await queryLLM(prompt, MEETING_AGENDA_SYSTEM_PROMPT, {
        temperature: 0.3,
        maxTokens: 1500,
        timeoutMs: 30_000,
      });
    }
  }

  const durationMs = Date.now() - startTime;

  if (!llmResult.success || !llmResult.data) {
    console.error("[GenerateAgenda] LLM error:", llmResult.error);
    return NextResponse.json(
      { error: "KI-Agenda konnte nicht erstellt werden. Bitte spaeter erneut versuchen." },
      { status: 502 }
    );
  }

  // ── Parse + validate ──
  const agenda = parseMeetingAgenda(llmResult.data);

  if (!agenda) {
    console.error("[GenerateAgenda] Parse failed. Raw:", llmResult.data?.slice(0, 500));
    return NextResponse.json(
      { error: "KI-Antwort konnte nicht verarbeitet werden." },
      { status: 502 }
    );
  }

  // ── Persist ──
  const now = new Date().toISOString();
  const { error: updateError } = await admin
    .from("meetings")
    .update({
      ai_agenda: JSON.stringify(agenda),
      ai_agenda_generated_at: now,
    })
    .eq("id", id);

  if (updateError) {
    console.error("[GenerateAgenda] DB update failed:", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // ── Cost logging (MT-5) ──
  // Estimate tokens: ~4 chars/token for German text
  const inputTokensEst = Math.ceil(prompt.length / 4);
  const outputTokensEst = Math.ceil((llmResult.data?.length ?? 0) / 4);
  // Sonnet 4 pricing: $3/M input, $15/M output (approximate)
  const costEst =
    (inputTokensEst * 3) / 1_000_000 + (outputTokensEst * 15) / 1_000_000;

  console.log(
    `[GenerateAgenda] meeting=${id} input_tokens≈${inputTokensEst} output_tokens≈${outputTokensEst} cost≈$${costEst.toFixed(4)} duration=${durationMs}ms`
  );

  // ── Audit log ──
  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "ai_agenda_generated",
    entity_type: "meeting",
    entity_id: id,
    changes: {
      regenerated: forceRegenerate,
      input_tokens_est: inputTokensEst,
      output_tokens_est: outputTokensEst,
      cost_usd_est: parseFloat(costEst.toFixed(4)),
      duration_ms: durationMs,
    },
    context: forceRegenerate
      ? "KI-Agenda regeneriert (manuell)"
      : "KI-Agenda erstellt (on-click)",
  });

  return NextResponse.json({
    success: true,
    agenda,
    cached: false,
    meta: {
      generated_at: now,
      duration_ms: durationMs,
      cost_usd_est: parseFloat(costEst.toFixed(4)),
    },
  });
}
