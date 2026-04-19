// =============================================================
// Manual Signal Extraction API — POST /api/signals/extract
// (SLC-436, MT-1)
// =============================================================
//
// On-demand signal extraction for a specific deal.
// Loads the last 5 meetings (with ai_summary) and 10 emails,
// runs extractSignals on each, and returns the total signal count.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/ai/rate-limiter";
import { extractSignals } from "@/lib/ai/signals";
import type { SignalDealContext } from "@/lib/ai/signals";

export const maxDuration = 120;

interface ExtractRequest {
  deal_id: string;
}

interface ExtractResponse {
  success: boolean;
  signalCount: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  // ── 1. Authentication ──────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, signalCount: 0, error: "Nicht autorisiert" } satisfies ExtractResponse,
      { status: 401 },
    );
  }

  // ── 2. Rate Limiting ───────────────────────────────────────
  const rateLimit = checkRateLimit(user.id);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        signalCount: 0,
        error: `Rate Limit erreicht. Bitte in ${rateLimit.retryAfter} Sekunden erneut versuchen.`,
      } satisfies ExtractResponse,
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfter ?? 60) },
      },
    );
  }

  // ── 3. Parse request body ──────────────────────────────────
  let body: ExtractRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, signalCount: 0, error: "Ungueltige Anfrage" } satisfies ExtractResponse,
      { status: 400 },
    );
  }

  if (!body.deal_id || typeof body.deal_id !== "string") {
    return NextResponse.json(
      { success: false, signalCount: 0, error: "deal_id ist erforderlich" } satisfies ExtractResponse,
      { status: 400 },
    );
  }

  // ── 4. Load deal context ───────────────────────────────────
  const admin = createAdminClient();

  const { data: deal } = await admin
    .from("deals")
    .select(
      "id, title, value, status, next_action, pipeline_stages(name), contacts(first_name, last_name), companies(name)",
    )
    .eq("id", body.deal_id)
    .maybeSingle();

  if (!deal) {
    return NextResponse.json(
      { success: false, signalCount: 0, error: "Deal nicht gefunden" } satisfies ExtractResponse,
      { status: 404 },
    );
  }

  const stageRaw = deal.pipeline_stages as { name: string } | { name: string }[] | null;
  const stage = Array.isArray(stageRaw) ? stageRaw[0] : stageRaw;
  const contactRaw = deal.contacts as { first_name: string | null; last_name: string | null } | { first_name: string | null; last_name: string | null }[] | null;
  const contact = Array.isArray(contactRaw) ? contactRaw[0] : contactRaw;
  const companyRaw = deal.companies as { name: string } | { name: string }[] | null;
  const company = Array.isArray(companyRaw) ? companyRaw[0] : companyRaw;

  const dealContext: SignalDealContext = {
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

  // ── 5. Load recent meetings (last 5 with ai_summary) ──────
  const { data: meetings } = await admin
    .from("meetings")
    .select("id, ai_summary")
    .eq("deal_id", body.deal_id)
    .not("ai_summary", "is", null)
    .order("created_at", { ascending: false })
    .limit(5);

  // ── 6. Load recent emails (last 10) ────────────────────────
  const { data: emails } = await admin
    .from("email_messages")
    .select("id, subject, body_text")
    .eq("deal_id", body.deal_id)
    .order("received_at", { ascending: false })
    .limit(10);

  // ── 7. Run extraction on each source ───────────────────────
  let totalSignals = 0;

  // Meetings
  for (const meeting of meetings ?? []) {
    const summaryText = extractSummaryText(meeting.ai_summary);
    if (!summaryText) continue;

    try {
      const results = await extractSignals(summaryText, dealContext, "meeting", meeting.id);
      totalSignals += results.length;
    } catch (err) {
      console.error(`[signals/extract] Meeting ${meeting.id} failed:`, err);
    }
  }

  // Emails
  for (const email of emails ?? []) {
    const sourceText = email.body_text || email.subject || "";
    if (!sourceText.trim()) continue;

    try {
      const results = await extractSignals(sourceText, dealContext, "email", email.id);
      totalSignals += results.length;
    } catch (err) {
      console.error(`[signals/extract] Email ${email.id} failed:`, err);
    }
  }

  // ── 8. Return result ───────────────────────────────────────
  return NextResponse.json(
    { success: true, signalCount: totalSignals } satisfies ExtractResponse,
    {
      status: 200,
      headers: {
        "X-RateLimit-Limit": String(rateLimit.limit),
        "X-RateLimit-Remaining": String(rateLimit.limit - rateLimit.currentCount),
      },
    },
  );
}

// ── Helper: extract text from ai_summary JSONB ───────────────

function extractSummaryText(aiSummary: unknown): string | null {
  if (!aiSummary || typeof aiSummary !== "object") return null;

  const summary = aiSummary as Record<string, unknown>;
  const parts: string[] = [];

  if (typeof summary.outcome === "string") parts.push(summary.outcome);

  if (Array.isArray(summary.decisions)) {
    for (const d of summary.decisions) {
      if (typeof d === "string") parts.push(d);
    }
  }

  if (Array.isArray(summary.action_items)) {
    for (const item of summary.action_items) {
      if (typeof item === "object" && item !== null) {
        const ai = item as { task?: string };
        if (ai.task) parts.push(ai.task);
      }
    }
  }

  if (typeof summary.next_step === "string") parts.push(summary.next_step);

  return parts.length > 0 ? parts.join("\n") : null;
}
