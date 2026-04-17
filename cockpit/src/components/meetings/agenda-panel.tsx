"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  RefreshCw,
  MessageSquare,
  AlertCircle,
  Users,
  Target,
} from "lucide-react";
import type { MeetingAgendaMode } from "@/app/actions/user-settings";

interface AgendaPanelProps {
  meetingId: string;
  aiAgenda: string | null;
  aiAgendaGeneratedAt: string | null;
  agendaMode?: MeetingAgendaMode;
}

interface AgendaData {
  last_communication: string;
  open_points: string[];
  decision_makers: Array<{ name: string; role: string | null }>;
  suggested_goal: string;
}

export function AgendaPanel({
  meetingId,
  aiAgenda,
  aiAgendaGeneratedAt,
  agendaMode = "on_click",
}: AgendaPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Parse existing agenda
  let agenda: AgendaData | null = null;
  if (aiAgenda) {
    try {
      agenda = typeof aiAgenda === "string" ? JSON.parse(aiAgenda) : aiAgenda;
    } catch {
      agenda = null;
    }
  }

  const handleGenerate = (regenerate: boolean) => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/meetings/${meetingId}/generate-agenda`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ regenerate }),
          }
        );

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Fehler bei der Agenda-Generierung");
          return;
        }

        // Reload to show persisted agenda
        window.location.reload();
      } catch {
        setError("Netzwerkfehler. Bitte erneut versuchen.");
      }
    });
  };

  // Mode is off — show disabled hint
  if (agendaMode === "off") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            KI-Agenda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            KI-Agenda ist deaktiviert. Aktivieren Sie sie in den{" "}
            <a href="/settings/meetings" className="underline">
              Meeting-Einstellungen
            </a>
            .
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            KI-Agenda
            <Badge variant="outline" className="text-[10px] font-normal">
              KI
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {agenda && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleGenerate(true)}
                disabled={isPending}
                className="h-7 text-xs"
              >
                <RefreshCw
                  className={`h-3 w-3 mr-1 ${isPending ? "animate-spin" : ""}`}
                />
                Neu generieren
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Error state */}
        {error && (
          <div className="flex items-start gap-2 text-sm text-destructive mb-3">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading state */}
        {isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Agenda wird generiert...
          </div>
        )}

        {/* No agenda yet — show generate button */}
        {!agenda && !isPending && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Noch keine KI-Agenda erstellt.
            </p>
            <Button
              size="sm"
              onClick={() => handleGenerate(false)}
              disabled={isPending}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              KI-Agenda generieren
            </Button>
          </div>
        )}

        {/* Agenda display */}
        {agenda && !isPending && (
          <div className="space-y-4">
            {/* Last Communication */}
            {agenda.last_communication && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <MessageSquare className="h-3 w-3" />
                  Letzte Kommunikation
                </div>
                <p className="text-sm">{agenda.last_communication}</p>
              </div>
            )}

            {/* Open Points */}
            {agenda.open_points && agenda.open_points.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <AlertCircle className="h-3 w-3" />
                  Offene Punkte
                </div>
                <ul className="space-y-1">
                  {agenda.open_points.map((point, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Decision Makers */}
            {agenda.decision_makers && agenda.decision_makers.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Users className="h-3 w-3" />
                  Entscheider
                </div>
                <ul className="space-y-1">
                  {agenda.decision_makers.map((dm, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      {dm.name}
                      {dm.role && (
                        <span className="text-muted-foreground">
                          ({dm.role})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested Goal */}
            {agenda.suggested_goal && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Target className="h-3 w-3" />
                  Empfohlenes Meeting-Ziel
                </div>
                <p className="text-sm font-medium">{agenda.suggested_goal}</p>
              </div>
            )}

            {/* Generated-at timestamp */}
            {aiAgendaGeneratedAt && (
              <p className="text-[11px] text-muted-foreground pt-1">
                Generiert am{" "}
                {new Date(aiAgendaGeneratedAt).toLocaleString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
