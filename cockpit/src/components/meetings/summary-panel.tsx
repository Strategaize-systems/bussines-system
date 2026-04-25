"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MeetingStatusBadge } from "./meeting-status-badge";
import {
  Brain,
  RefreshCw,
  CheckCircle2,
  ListChecks,
  ArrowRight,
  Target,
} from "lucide-react";
import type { SummaryStatus, AiSummary } from "@/app/(app)/meetings/actions";

interface SummaryPanelProps {
  meetingId: string;
  aiSummary: AiSummary | null;
  summaryStatus: SummaryStatus | null;
}

export function SummaryPanel({
  meetingId,
  aiSummary,
  summaryStatus,
}: SummaryPanelProps) {
  const [isRetrying, startRetry] = useTransition();
  const [localStatus, setLocalStatus] = useState<SummaryStatus | null>(null);

  const effectiveStatus = localStatus || summaryStatus;

  const handleRetry = () => {
    startRetry(async () => {
      const res = await fetch(`/api/meetings/${meetingId}/retry-summary`, {
        method: "POST",
      });
      if (res.ok) {
        setLocalStatus("pending");
      }
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4" />
            KI-Zusammenfassung
          </CardTitle>
          <div className="flex items-center gap-2">
            <MeetingStatusBadge type="summary" status={effectiveStatus} />
            {effectiveStatus === "failed" && (
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
        {effectiveStatus === "processing" && (
          <p className="text-sm text-muted-foreground">
            Zusammenfassung wird erstellt...
          </p>
        )}

        {effectiveStatus === "completed" && aiSummary && (
          <div className="space-y-4">
            {/* Outcome */}
            {aiSummary.outcome && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Target className="h-3 w-3" />
                  Ergebnis
                </div>
                <p className="text-sm">{aiSummary.outcome}</p>
              </div>
            )}

            {/* Decisions */}
            {aiSummary.decisions && aiSummary.decisions.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3" />
                  Entscheidungen
                </div>
                <ul className="space-y-1">
                  {aiSummary.decisions.map((d, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">•</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Items */}
            {aiSummary.action_items && aiSummary.action_items.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <ListChecks className="h-3 w-3" />
                  Aufgaben
                </div>
                <ul className="space-y-1">
                  {aiSummary.action_items.map((item, i) => {
                    const text =
                      typeof item === "string"
                        ? item
                        : `${item.owner ? `${item.owner}: ` : ""}${item.task}`;
                    return (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        {text}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Next Step */}
            {aiSummary.next_step && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <ArrowRight className="h-3 w-3" />
                  Nächster Schritt
                </div>
                <p className="text-sm font-medium">{aiSummary.next_step}</p>
              </div>
            )}

            {/* Key Topics */}
            {aiSummary.key_topics && aiSummary.key_topics.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Target className="h-3 w-3" />
                  Kernthemen
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {aiSummary.key_topics.map((topic, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!effectiveStatus && (
          <p className="text-sm text-muted-foreground">
            Keine Zusammenfassung verfügbar.
          </p>
        )}

        {effectiveStatus === "pending" && (
          <p className="text-sm text-muted-foreground">
            Zusammenfassung wird vorbereitet...
          </p>
        )}

        {effectiveStatus === "failed" && (
          <p className="text-sm text-destructive">
            Zusammenfassung fehlgeschlagen. Klicke &quot;Retry&quot; um es erneut zu versuchen.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
