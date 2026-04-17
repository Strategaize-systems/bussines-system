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
  const admin = createAdminClient();

  // Verify meeting exists and is in failed state
  const { data: meeting } = await admin
    .from("meetings")
    .select("id, summary_status, transcript_status, transcript")
    .eq("id", id)
    .maybeSingle();

  if (!meeting) {
    return NextResponse.json({ error: "Meeting nicht gefunden" }, { status: 404 });
  }

  if (meeting.summary_status !== "failed") {
    return NextResponse.json(
      { error: `Summary-Status ist '${meeting.summary_status}', nicht 'failed'` },
      { status: 400 },
    );
  }

  if (meeting.transcript_status !== "completed" || !meeting.transcript) {
    return NextResponse.json(
      { error: "Kein abgeschlossenes Transkript vorhanden" },
      { status: 400 },
    );
  }

  // Reset to pending — the summary cron will pick it up on next run
  const { error } = await admin
    .from("meetings")
    .update({ summary_status: "pending" })
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
      before: { summary_status: "failed" },
      after: { summary_status: "pending", event: "retry_summary" },
    },
    context: "Manual summary retry triggered",
  });

  return NextResponse.json({ success: true, message: "Zusammenfassung wird erneut erstellt" });
}
