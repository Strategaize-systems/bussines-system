// SLC-515 / MT-3 + MT-4 — Voice-Agent Webhook Endpoint (FEAT-514, DEC-075)
// POST /api/webhooks/voice-agent
// Receives SMAO/Synthflow webhooks for inbound calls handled by voice agent.
// Validates signature, creates call record, triggers classification-based actions.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVoiceAgentProvider } from "@/lib/telephony/voice-agent";
import type {
  VoiceAgentCallResult,
  VoiceAgentClassification,
} from "@/lib/telephony/voice-agent";
import { sendPushNotification } from "@/lib/push/send";

type Ids = { contactId: string | null; dealId: string | null; dealOwnerId: string | null };

const SIGNATURE_HEADERS = [
  "x-smao-signature",
  "x-smao-signature-256",
  "x-webhook-signature",
];

function getSignatureHeader(req: NextRequest): string | null {
  for (const name of SIGNATURE_HEADERS) {
    const v = req.headers.get(name);
    if (v) return v;
  }
  return null;
}

function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-()\/]/g, "");
}

export async function POST(request: NextRequest) {
  // AC — Gate 1: SMAO_ENABLED check.
  if (process.env.SMAO_ENABLED !== "true") {
    return NextResponse.json({ error: "SMAO disabled" }, { status: 404 });
  }

  const secret = process.env.SMAO_WEBHOOK_SECRET || "";
  if (!secret) {
    console.error("[voice-agent-webhook] SMAO_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const provider = getVoiceAgentProvider();

  // AC — Gate 2: signature validation.
  const signature = getSignatureHeader(request);
  if (!provider.validateWebhook(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let result: VoiceAgentCallResult;
  try {
    result = provider.parsePayload(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Parse failed: ${message}` }, { status: 400 });
  }

  const admin = createAdminClient();

  // Contact + Deal resolution via phone number match.
  const ids = await resolveContactAndDeal(admin, result.callerNumber);

  // Create inbound call record.
  const now = new Date();
  const startedAt = new Date(now.getTime() - result.durationSeconds * 1000);
  const { data: call, error: callError } = await admin
    .from("calls")
    .insert({
      direction: "inbound",
      status: "completed",
      phone_number: result.callerNumber,
      caller_id: result.callerName ?? null,
      started_at: startedAt.toISOString(),
      ended_at: now.toISOString(),
      duration_seconds: result.durationSeconds,
      recording_url: result.recordingUrl ?? null,
      recording_status: result.recordingUrl ? "uploaded" : "not_recording",
      transcript: result.transcript || null,
      transcript_status: result.transcript ? "completed" : "pending",
      summary_status: "pending",
      voice_agent_handled: true,
      voice_agent_classification: result.classification,
      voice_agent_transcript: result.transcript || null,
      contact_id: ids.contactId,
      deal_id: ids.dealId,
    })
    .select("id")
    .single();

  if (callError || !call) {
    console.error("[voice-agent-webhook] Call insert failed:", callError?.message);
    return NextResponse.json(
      { error: `Call insert failed: ${callError?.message}` },
      { status: 500 },
    );
  }

  const summary = summarizeTranscript(result.transcript);

  // Classification-based actions.
  const actions = await dispatchClassificationActions({
    admin,
    classification: result.classification,
    result,
    ids,
    callId: call.id,
    summary,
  });

  return NextResponse.json({
    ok: true,
    callId: call.id,
    contactId: ids.contactId,
    dealId: ids.dealId,
    classification: result.classification,
    provider: provider.getProviderName(),
    actions,
  });
}

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------

async function resolveContactAndDeal(
  admin: ReturnType<typeof createAdminClient>,
  callerNumber: string,
): Promise<Ids> {
  const normalized = normalizePhone(callerNumber);

  const { data: contacts } = await admin
    .from("contacts")
    .select("id, phone")
    .not("phone", "is", null);

  const contactMatch = (contacts || []).find(
    (c) => c.phone && normalizePhone(c.phone) === normalized,
  );
  if (!contactMatch) {
    return { contactId: null, dealId: null, dealOwnerId: null };
  }

  // Most recently updated active deal for this contact.
  const { data: deal } = await admin
    .from("deals")
    .select("id, created_by")
    .eq("contact_id", contactMatch.id)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    contactId: contactMatch.id,
    dealId: deal?.id ?? null,
    dealOwnerId: deal?.created_by ?? null,
  };
}

function summarizeTranscript(transcript: string): string {
  if (!transcript) return "Kein Transkript verfuegbar";
  const trimmed = transcript.trim();
  if (trimmed.length <= 240) return trimmed;
  return trimmed.slice(0, 237) + "...";
}

type DispatchArgs = {
  admin: ReturnType<typeof createAdminClient>;
  classification: VoiceAgentClassification;
  result: VoiceAgentCallResult;
  ids: Ids;
  callId: string;
  summary: string;
};

type ActionResult = {
  activityId?: string;
  taskId?: string;
  pushSent?: boolean;
  pushError?: string;
};

async function dispatchClassificationActions(args: DispatchArgs): Promise<ActionResult> {
  const { classification } = args;
  const actions: ActionResult = {};

  const activityBody = buildActivityBody(classification, args.result, args.summary);
  actions.activityId = await insertActivity(args, activityBody);

  switch (classification) {
    case "urgent": {
      const push = await sendUrgentPush(args);
      actions.pushSent = push.success;
      if (!push.success) actions.pushError = push.error;
      break;
    }
    case "callback":
      actions.taskId = await insertTask(args, {
        title: `Rueckruf: ${args.result.callerName || args.result.callerNumber}`,
        description: `Rueckruf erbeten.\nAnrufer: ${args.result.callerNumber}\n\nTranskript:\n${args.result.transcript || "(leer)"}`,
        priority: "high",
      });
      break;
    case "meeting_request":
      actions.taskId = await insertTask(args, {
        title: `Meeting-Anfrage: ${args.result.callerName || args.result.callerNumber}`,
        description: `Meeting-Anfrage eingegangen.\nAnrufer: ${args.result.callerNumber}\n\nTranskript:\n${args.result.transcript || "(leer)"}`,
        priority: "medium",
      });
      break;
    case "info":
    default:
      break;
  }

  return actions;
}

function buildActivityBody(
  classification: VoiceAgentClassification,
  r: VoiceAgentCallResult,
  summary: string,
): { title: string; description: string } {
  const caller = r.callerName ? `${r.callerName} (${r.callerNumber})` : r.callerNumber;
  const prefixMap: Record<VoiceAgentClassification, string> = {
    urgent: "DRINGEND",
    callback: "Rueckruf erbeten",
    info: "Info-Anruf",
    meeting_request: "Meeting-Anfrage",
  };
  const prefix = prefixMap[classification];
  return {
    title: `${prefix}: ${caller}`,
    description: `${prefix} (Voice-Agent).\nAnrufer: ${caller}\nKlassifikation: ${classification} (Confidence ${Math.round(r.confidence * 100)}%)\nDauer: ${r.durationSeconds}s\n\n${summary}`,
  };
}

async function insertActivity(
  args: DispatchArgs,
  body: { title: string; description: string },
): Promise<string | undefined> {
  const { admin, ids } = args;
  const { data, error } = await admin
    .from("activities")
    .insert({
      type: "call",
      title: body.title,
      description: body.description,
      contact_id: ids.contactId,
      deal_id: ids.dealId,
      ai_generated: true,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[voice-agent-webhook] activity insert failed:", error.message);
    return undefined;
  }
  return data?.id;
}

async function insertTask(
  args: DispatchArgs,
  task: { title: string; description: string; priority: "high" | "medium" | "low" },
): Promise<string | undefined> {
  const { admin, ids } = args;
  const { data, error } = await admin
    .from("tasks")
    .insert({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: "open",
      contact_id: ids.contactId,
      deal_id: ids.dealId,
      assigned_to: ids.dealOwnerId,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[voice-agent-webhook] task insert failed:", error.message);
    return undefined;
  }
  return data?.id;
}

async function sendUrgentPush(args: DispatchArgs): Promise<{ success: boolean; error?: string }> {
  const { admin, result, ids } = args;
  const recipients = await resolvePushRecipients(admin, ids.dealOwnerId);
  if (recipients.length === 0) {
    return { success: false, error: "no_recipients" };
  }

  const payload = {
    title: `DRINGEND: Anruf von ${result.callerName || result.callerNumber}`,
    body: summarizeTranscript(result.transcript),
    tag: "voice-agent-urgent",
    url: ids.dealId ? `/pipeline?deal=${ids.dealId}` : "/pipeline",
  };

  let anySuccess = false;
  const errors: string[] = [];
  for (const userId of recipients) {
    const r = await sendPushNotification(userId, payload);
    if (r.success) anySuccess = true;
    else if (r.error) errors.push(r.error);
  }
  return anySuccess ? { success: true } : { success: false, error: errors.join(",") || "unknown" };
}

async function resolvePushRecipients(
  admin: ReturnType<typeof createAdminClient>,
  ownerId: string | null,
): Promise<string[]> {
  if (ownerId) {
    const { data } = await admin
      .from("user_settings")
      .select("user_id")
      .eq("user_id", ownerId)
      .not("push_subscription", "is", null)
      .maybeSingle();
    if (data?.user_id) return [data.user_id];
  }
  const { data } = await admin
    .from("user_settings")
    .select("user_id")
    .not("push_subscription", "is", null);
  return (data || []).map((r) => r.user_id).filter(Boolean);
}
