"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MeetingStatusBadge } from "./meeting-status-badge";
import { Mic, RefreshCw, Save, Pencil } from "lucide-react";
import type { TranscriptStatus } from "@/app/(app)/meetings/actions";

interface TranscriptPanelProps {
  meetingId: string;
  transcript: string | null;
  transcriptStatus: TranscriptStatus | null;
  onSave?: (transcript: string) => Promise<void>;
}

export function TranscriptPanel({
  meetingId,
  transcript,
  transcriptStatus,
  onSave,
}: TranscriptPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(transcript ?? "");
  const [isRetrying, startRetry] = useTransition();
  const [isSaving, startSave] = useTransition();
  const [edited, setEdited] = useState(false);

  const handleRetry = () => {
    startRetry(async () => {
      const res = await fetch(`/api/meetings/${meetingId}/retry-transcript`, {
        method: "POST",
      });
      if (res.ok) {
        window.location.reload();
      }
    });
  };

  const handleSave = () => {
    startSave(async () => {
      if (onSave) {
        await onSave(editValue);
        setEdited(true);
      }
      setIsEditing(false);
    });
  };

  const handleEdit = () => {
    setEditValue(transcript ?? "");
    setIsEditing(true);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Transkript
            {edited && (
              <Badge variant="outline" className="text-[10px]">
                bearbeitet
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <MeetingStatusBadge type="transcript" status={transcriptStatus} />
            {transcriptStatus === "failed" && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={isRetrying}
                className="h-7 text-xs"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isRetrying ? "animate-spin" : ""}`} />
                Retry
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {transcriptStatus === "processing" && (
          <p className="text-sm text-muted-foreground">
            Transkription wird erstellt...
          </p>
        )}

        {transcriptStatus === "completed" && transcript && (
          <>
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={12}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="h-7 text-xs"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Speichern
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(false)}
                    className="h-7 text-xs"
                  >
                    Abbrechen
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative group">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap max-h-80 overflow-y-auto">
                  {transcript}
                </p>
                {onSave && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleEdit}
                    className="absolute top-0 right-0 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </>
        )}

        {!transcriptStatus && (
          <p className="text-sm text-muted-foreground">
            Kein Transkript verfügbar.
          </p>
        )}

        {transcriptStatus === "pending" && (
          <p className="text-sm text-muted-foreground">
            Transkript wird vorbereitet...
          </p>
        )}

        {transcriptStatus === "failed" && (
          <p className="text-sm text-destructive">
            Transkription fehlgeschlagen. Klicke &quot;Retry&quot; um es erneut zu versuchen.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
