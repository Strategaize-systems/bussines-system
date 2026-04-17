"use client";

import { TranscriptPanel } from "./transcript-panel";
import { SummaryPanel } from "./summary-panel";
import { MeetingStatusBadge } from "./meeting-status-badge";
import type { Meeting } from "@/app/(app)/meetings/actions";

interface MeetingIntelligenceProps {
  meeting: Meeting;
  onSaveTranscript?: (transcript: string) => Promise<void>;
}

/**
 * Combined view of Recording Status, Transcript, and AI Summary.
 * Shown in the Meeting Sheet for meetings that have recordings.
 */
export function MeetingIntelligence({
  meeting,
  onSaveTranscript,
}: MeetingIntelligenceProps) {
  const hasRecording =
    meeting.recording_status === "completed" ||
    meeting.recording_status === "uploading" ||
    meeting.recording_status === "deleted";

  const hasTranscriptOrSummary =
    meeting.transcript_status || meeting.summary_status;

  if (!hasRecording && !hasTranscriptOrSummary) {
    return null;
  }

  return (
    <div className="space-y-3 mt-4">
      <h4 className="text-sm font-medium text-muted-foreground">
        Meeting Intelligence
      </h4>

      {/* Recording status info */}
      {meeting.recording_duration_seconds && (
        <p className="text-xs text-muted-foreground">
          Aufnahme: {formatDuration(meeting.recording_duration_seconds)}
          {meeting.recording_status === "deleted" && " (Aufnahme entfernt, Transkript erhalten)"}
        </p>
      )}

      <TranscriptPanel
        meetingId={meeting.id}
        transcript={meeting.transcript}
        transcriptStatus={meeting.transcript_status}
        onSave={onSaveTranscript}
      />

      <SummaryPanel
        meetingId={meeting.id}
        aiSummary={meeting.ai_summary}
        summaryStatus={meeting.summary_status}
      />
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}
