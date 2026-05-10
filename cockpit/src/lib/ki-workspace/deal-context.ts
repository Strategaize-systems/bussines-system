import { createClient } from "@/lib/supabase/server";

export interface DealContextDeal {
  id: string;
  title: string;
  value: number | null;
  status: string;
  stageName: string | null;
  probability: number | null;
  pipelineName: string | null;
  nextAction: string | null;
  nextActionDate: string | null;
  expectedCloseDate: string | null;
  wonLostReason: string | null;
  wonLostDetails: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface DealContextContact {
  name: string;
  position: string | null;
  email: string | null;
  phone: string | null;
}

export interface DealContextCompany {
  name: string;
  industry: string | null;
}

export interface DealContextActivity {
  type: string;
  title: string;
  summary: string | null;
  createdAt: string;
}

export interface DealContextTask {
  title: string;
  status: string;
  dueDate: string | null;
  priority: string | null;
}

export interface DealContextMeeting {
  title: string;
  startsAt: string | null;
  summary: string | null;
}

export interface DealContextProposal {
  title: string;
  status: string | null;
  totalGross: number | null;
  createdAt: string;
}

export interface DealContextSignal {
  signalType: string;
  confidence: number | null;
  source: string | null;
  extractedText: string | null;
  createdAt: string;
}

export interface DealContextEmail {
  subject: string | null;
  direction: string | null;
  receivedAt: string | null;
  bodyExcerpt: string | null;
}

export interface DealContextCall {
  direction: string | null;
  durationSeconds: number | null;
  summary: string | null;
  createdAt: string;
}

export interface DealContext {
  deal: DealContextDeal;
  contact: DealContextContact | null;
  company: DealContextCompany | null;
  activities: DealContextActivity[];
  tasks: DealContextTask[];
  meetings: DealContextMeeting[];
  proposals: DealContextProposal[];
  signals: DealContextSignal[];
  emails: DealContextEmail[];
  calls: DealContextCall[];
}

const ACTIVITY_LIMIT = 30;
const TASK_LIMIT = 20;
const MEETING_LIMIT = 10;
const PROPOSAL_LIMIT = 10;
const SIGNAL_LIMIT = 20;
const EMAIL_LIMIT = 15;
const CALL_LIMIT = 10;
const EMAIL_BODY_EXCERPT_CHARS = 600;

export async function loadDealContext(dealId: string): Promise<DealContext> {
  const supabase = await createClient();

  const { data: dealRow, error: dealError } = await supabase
    .from("deals")
    .select(
      "id, title, value, status, next_action, next_action_date, expected_close_date, won_lost_reason, won_lost_details, closed_at, tags, created_at, updated_at, pipeline_id, stage_id, pipelines(name), pipeline_stages(name, probability), contacts(first_name, last_name, position, email, phone), companies(name, industry)",
    )
    .eq("id", dealId)
    .maybeSingle();

  if (dealError) throw new Error(`Deal-Load fehlgeschlagen: ${dealError.message}`);
  if (!dealRow) throw new Error("Deal nicht gefunden");

  const stageRow = unwrap(dealRow.pipeline_stages) as
    | { name: string; probability: number | null }
    | null;
  const pipelineRow = unwrap(dealRow.pipelines) as { name: string } | null;
  const contactRow = unwrap(dealRow.contacts) as
    | {
        first_name: string | null;
        last_name: string | null;
        position: string | null;
        email: string | null;
        phone: string | null;
      }
    | null;
  const companyRow = unwrap(dealRow.companies) as
    | { name: string; industry: string | null }
    | null;

  const [activitiesRes, tasksRes, meetingsRes, proposalsRes, signalsRes, emailsRes, callsRes] = await Promise.all([
    supabase
      .from("activities")
      .select("type, title, summary, created_at")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false })
      .limit(ACTIVITY_LIMIT),
    supabase
      .from("tasks")
      .select("title, status, due_date, priority")
      .eq("deal_id", dealId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(TASK_LIMIT),
    supabase
      .from("meetings")
      .select("title, scheduled_at, ai_summary")
      .eq("deal_id", dealId)
      .order("scheduled_at", { ascending: false })
      .limit(MEETING_LIMIT),
    supabase
      .from("proposals")
      .select("title, status, total_gross, created_at")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false })
      .limit(PROPOSAL_LIMIT),
    supabase
      .from("signals")
      .select("signal_type, confidence, source_type, extracted_text, created_at")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false })
      .limit(SIGNAL_LIMIT),
    supabase
      .from("email_messages")
      .select("subject, direction, received_at, body_text")
      .eq("deal_id", dealId)
      .order("received_at", { ascending: false })
      .limit(EMAIL_LIMIT),
    supabase
      .from("calls")
      .select("direction, duration_seconds, summary, created_at")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false })
      .limit(CALL_LIMIT),
  ]);

  return {
    deal: {
      id: dealRow.id,
      title: dealRow.title,
      value: dealRow.value ?? null,
      status: dealRow.status ?? "active",
      stageName: stageRow?.name ?? null,
      probability: stageRow?.probability ?? null,
      pipelineName: pipelineRow?.name ?? null,
      nextAction: dealRow.next_action ?? null,
      nextActionDate: dealRow.next_action_date ?? null,
      expectedCloseDate: dealRow.expected_close_date ?? null,
      wonLostReason: dealRow.won_lost_reason ?? null,
      wonLostDetails: dealRow.won_lost_details ?? null,
      closedAt: dealRow.closed_at ?? null,
      createdAt: dealRow.created_at,
      updatedAt: dealRow.updated_at,
      tags: Array.isArray(dealRow.tags) ? dealRow.tags : [],
    },
    contact: contactRow
      ? {
          name: `${contactRow.first_name ?? ""} ${contactRow.last_name ?? ""}`.trim() || "Unbekannter Kontakt",
          position: contactRow.position ?? null,
          email: contactRow.email ?? null,
          phone: contactRow.phone ?? null,
        }
      : null,
    company: companyRow
      ? {
          name: companyRow.name,
          industry: companyRow.industry ?? null,
        }
      : null,
    activities: (activitiesRes.data ?? []).map((a) => ({
      type: a.type ?? "note",
      title: a.title ?? "",
      summary: a.summary ?? null,
      createdAt: a.created_at,
    })),
    tasks: (tasksRes.data ?? []).map((t) => ({
      title: t.title ?? "",
      status: t.status ?? "open",
      dueDate: t.due_date ?? null,
      priority: t.priority ?? null,
    })),
    meetings: (meetingsRes.data ?? []).map((m) => ({
      title: m.title ?? "",
      startsAt: m.scheduled_at ?? null,
      summary: extractMeetingSummaryText(m.ai_summary),
    })),
    proposals: (proposalsRes.data ?? []).map((p) => ({
      title: p.title ?? "",
      status: p.status ?? null,
      totalGross: p.total_gross ?? null,
      createdAt: p.created_at,
    })),
    signals: (signalsRes.data ?? []).map((s) => ({
      signalType: s.signal_type ?? "",
      confidence: s.confidence ?? null,
      source: s.source_type ?? null,
      extractedText: s.extracted_text ?? null,
      createdAt: s.created_at,
    })),
    emails: (emailsRes.data ?? []).map((e) => ({
      subject: e.subject ?? null,
      direction: e.direction ?? null,
      receivedAt: e.received_at ?? null,
      bodyExcerpt: truncateText(e.body_text, EMAIL_BODY_EXCERPT_CHARS),
    })),
    calls: (callsRes.data ?? []).map((c) => ({
      direction: c.direction ?? null,
      durationSeconds: c.duration_seconds ?? null,
      summary: c.summary ?? null,
      createdAt: c.created_at,
    })),
  };
}

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function truncateText(text: string | null | undefined, max: number): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

function extractMeetingSummaryText(aiSummary: unknown): string | null {
  if (!aiSummary || typeof aiSummary !== "object") return null;
  const summary = aiSummary as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof summary.outcome === "string") parts.push(summary.outcome);
  if (Array.isArray(summary.decisions)) {
    for (const d of summary.decisions) if (typeof d === "string") parts.push(d);
  }
  if (Array.isArray(summary.action_items)) {
    for (const item of summary.action_items) {
      if (typeof item === "object" && item !== null) {
        const ai = item as { task?: string };
        if (typeof ai.task === "string") parts.push(ai.task);
      }
    }
  }
  if (typeof summary.next_step === "string") parts.push(summary.next_step);
  return parts.length > 0 ? parts.join(" | ") : null;
}
