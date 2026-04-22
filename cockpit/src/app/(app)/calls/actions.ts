"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ── Types ──────────────────────────────────────────────────────────

export type CallDirection = "outbound" | "inbound";

export type CallStatus =
  | "initiated"
  | "ringing"
  | "connected"
  | "completed"
  | "failed"
  | "missed";

export type RecordingStatus =
  | "not_recording"
  | "pending"
  | "recording"
  | "uploading"
  | "completed"
  | "failed"
  | "deleted";

export type TranscriptStatus = "pending" | "processing" | "completed" | "failed";
export type SummaryStatus = "pending" | "processing" | "completed" | "failed";

export type VoiceAgentClassification =
  | "urgent"
  | "callback"
  | "info"
  | "meeting_request";

export type CallAiSummary = {
  outcome?: string;
  action_items?: string[];
  next_step?: string;
  key_topics?: string[];
};

export type Call = {
  id: string;
  deal_id: string | null;
  contact_id: string | null;
  direction: CallDirection;
  status: CallStatus;
  phone_number: string | null;
  caller_id: string | null;
  started_at: string | null;
  connected_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  recording_url: string | null;
  recording_status: RecordingStatus;
  transcript: string | null;
  transcript_status: TranscriptStatus | null;
  ai_summary: CallAiSummary | null;
  summary_status: SummaryStatus | null;
  voice_agent_handled: boolean;
  voice_agent_classification: VoiceAgentClassification | null;
  voice_agent_transcript: string | null;
  asterisk_channel_id: string | null;
  sip_call_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Relations (companies via contacts, kein direkter FK auf calls)
  contacts?: { id: string; first_name: string; last_name: string; phone: string | null } | null;
  deals?: { id: string; title: string } | null;
};

// ── Queries ─────────────────────────────────────────────────────────

export async function getCallsByDeal(dealId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calls")
    .select(
      "*, contacts(id, first_name, last_name, phone), deals(id, title)"
    )
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Call[];
}

export async function getCallsByContact(contactId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calls")
    .select("*, contacts(id, first_name, last_name, phone)")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Call[];
}

export async function getCallById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calls")
    .select(
      "*, contacts(id, first_name, last_name, phone), deals(id, title)"
    )
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data as Call;
}

export async function getRecentCalls(limit: number = 10) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calls")
    .select(
      "*, contacts(id, first_name, last_name, phone), deals(id, title)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data as Call[];
}

// ── Mutations ───────────────────────────────────────────────────────

export async function createCall(params: {
  dealId?: string;
  contactId?: string;
  phoneNumber: string;
  direction?: CallDirection;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("calls")
    .insert({
      deal_id: params.dealId || null,
      contact_id: params.contactId || null,
      phone_number: params.phoneNumber,
      direction: params.direction || "outbound",
      status: "initiated",
      started_at: new Date().toISOString(),
      created_by: user?.id || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/deals");
  revalidatePath("/mein-tag");
  return data as Call;
}

export async function updateCallStatus(
  callId: string,
  status: CallStatus,
  extra?: {
    connectedAt?: string;
    endedAt?: string;
    durationSeconds?: number;
    recordingStatus?: RecordingStatus;
  }
) {
  const supabase = await createClient();

  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (extra?.connectedAt) updates.connected_at = extra.connectedAt;
  if (extra?.endedAt) updates.ended_at = extra.endedAt;
  if (extra?.durationSeconds !== undefined)
    updates.duration_seconds = extra.durationSeconds;
  if (extra?.recordingStatus) updates.recording_status = extra.recordingStatus;

  const { data, error } = await supabase
    .from("calls")
    .update(updates)
    .eq("id", callId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/deals");
  revalidatePath("/mein-tag");
  return data as Call;
}

export async function getSipConfig() {
  const supabase = await createClient();

  // Auth-Check: nur authentifizierte User erhalten SIP-Credentials
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert");

  return {
    wssUrl: `wss://${process.env.NEXT_PUBLIC_SIP_DOMAIN || "sip.strategaizetransition.com"}`,
    username: "webrtc-user",
    password: process.env.ASTERISK_WEBRTC_PASSWORD || "",
    domain: process.env.NEXT_PUBLIC_SIP_DOMAIN || "sip.strategaizetransition.com",
    callerId: process.env.SIP_CALLER_ID || "",
  };
}
