import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // ── SEC-891 IDOR-Mitigation: User-Client-Vor-Check via RLS ──
  // Verifiziert dass der Caller das Meeting via Owner-/Team-RLS sehen darf,
  // BEVOR admin (BYPASSRLS) angerufen wird. Sonst koennte ein Member den
  // transcript_status fremder Meetings zuruecksetzen + Cross-Owner-Audit-Log-
  // Eintraege erzeugen + Whisper-Re-Run-Cost auf fremden Aufnahmen ausloesen.
  // Audit RPT-Cross-Repo 2026-05-30 SEC-004.
  const { data: ownedMeeting } = await supabase
    .from("meetings")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!ownedMeeting) {
    return NextResponse.json({ error: "Meeting nicht gefunden" }, { status: 404 });
  }

  const admin = createAdminClient();

  // Verify meeting exists and is in failed state
  const { data: meeting } = await admin
    .from("meetings")
    .select("id, transcript_status, recording_status, recording_url")
    .eq("id", id)
    .maybeSingle();

  if (!meeting) {
    return NextResponse.json({ error: "Meeting nicht gefunden" }, { status: 404 });
  }

  if (meeting.transcript_status !== "failed") {
    return NextResponse.json(
      { error: `Transcript-Status ist '${meeting.transcript_status}', nicht 'failed'` },
      { status: 400 },
    );
  }

  if (meeting.recording_status !== "completed" || !meeting.recording_url) {
    return NextResponse.json(
      { error: "Keine abgeschlossene Aufnahme vorhanden" },
      { status: 400 },
    );
  }

  // Reset to pending — the transcript cron will pick it up on next run
  const { error } = await admin
    .from("meetings")
    .update({ transcript_status: "pending" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log
  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "update",
    entity_type: "meeting",
    entity_id: id,
    changes: {
      before: { transcript_status: "failed" },
      after: { transcript_status: "pending", event: "retry_transcript" },
    },
    context: "Manual transcript retry triggered",
  });

  return NextResponse.json({ success: true, message: "Transkription wird erneut gestartet" });
}
