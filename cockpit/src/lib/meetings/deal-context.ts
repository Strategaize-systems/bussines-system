// =============================================================
// Deal Context Collector — Shared context builder for AI prompts
// =============================================================
// Used by meeting-agenda (SLC-419) and meeting-summary (SLC-416).
// Collects deal name, stage, value, recent activities, open tasks,
// and contact information for a given meeting.

import { createAdminClient } from "@/lib/supabase/admin";
import type { MeetingAgendaContext } from "@/lib/ai/prompts/meeting-agenda";

interface MeetingRef {
  id: string;
  title: string | null;
  deal_id: string | null;
  contact_id: string | null;
  company_id: string | null;
}

/**
 * Builds the deal context for a meeting's AI agenda generation.
 * Fetches deal info, recent activities (14d), open tasks, and contacts.
 */
export async function buildAgendaContext(
  admin: ReturnType<typeof createAdminClient>,
  meeting: MeetingRef
): Promise<MeetingAgendaContext> {
  const context: MeetingAgendaContext = {
    meetingTitle: meeting.title || "Meeting",
  };

  // ── Deal info ──
  if (meeting.deal_id) {
    const { data: deal } = await admin
      .from("deals")
      .select("title, status, expected_value, pipeline_stages(name)")
      .eq("id", meeting.deal_id)
      .maybeSingle();

    if (deal) {
      context.dealName = deal.title ?? undefined;
      context.dealValue = deal.expected_value ?? undefined;
      // pipeline_stages is a FK join — Supabase may return object or array
      const stageRaw = deal.pipeline_stages as
        | { name: string }
        | { name: string }[]
        | null;
      const stage = Array.isArray(stageRaw) ? stageRaw[0] : stageRaw;
      context.dealStage = stage?.name ?? undefined;
    }
  }

  // ── Recent activities (last 14 days) ──
  const refId = meeting.deal_id || meeting.contact_id;
  if (refId) {
    const fourteenDaysAgo = new Date(
      Date.now() - 14 * 24 * 60 * 60 * 1000
    ).toISOString();

    let query = admin
      .from("activities")
      .select("type, title, created_at")
      .gte("created_at", fourteenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(15);

    // Prefer deal-scoped activities, fall back to contact-scoped
    if (meeting.deal_id) {
      query = query.eq("deal_id", meeting.deal_id);
    } else if (meeting.contact_id) {
      query = query.eq("contact_id", meeting.contact_id);
    }

    const { data: activities } = await query;

    if (activities && activities.length > 0) {
      context.recentActivities = activities.map((a) => ({
        type: a.type,
        title: a.title || "(ohne Titel)",
        date: new Date(a.created_at).toLocaleDateString("de-DE"),
      }));
    }
  }

  // ── Open tasks ──
  if (meeting.deal_id) {
    const { data: tasks } = await admin
      .from("tasks")
      .select("title, due_date")
      .eq("deal_id", meeting.deal_id)
      .eq("status", "open")
      .order("due_date", { ascending: true })
      .limit(10);

    if (tasks && tasks.length > 0) {
      context.openTasks = tasks.map((t) => ({
        title: t.title || "(ohne Titel)",
        dueDate: t.due_date
          ? new Date(t.due_date).toLocaleDateString("de-DE")
          : undefined,
      }));
    }
  }

  // ── Contacts ──
  if (meeting.contact_id) {
    const { data: contactData } = await admin
      .from("contacts")
      .select("first_name, last_name, role, company_id, companies(name)")
      .eq("id", meeting.contact_id)
      .maybeSingle();

    if (contactData) {
      const companyRaw = contactData.companies as
        | { name: string }
        | { name: string }[]
        | null;
      const company = Array.isArray(companyRaw) ? companyRaw[0] : companyRaw;
      context.contacts = [
        {
          name: `${contactData.first_name || ""} ${contactData.last_name || ""}`.trim(),
          role: contactData.role ?? undefined,
          company: company?.name ?? undefined,
        },
      ];
    }
  }

  return context;
}
