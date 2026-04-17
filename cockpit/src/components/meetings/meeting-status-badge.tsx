"use client";

import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Clock, Mic, Brain } from "lucide-react";

type StatusType = "pending" | "processing" | "completed" | "failed" | null;

const STATUS_CONFIG: Record<
  string,
  { icon: typeof Clock; label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { icon: Clock, label: "Ausstehend", variant: "outline" },
  processing: { icon: Loader2, label: "Verarbeitung...", variant: "secondary" },
  completed: { icon: CheckCircle2, label: "Fertig", variant: "default" },
  failed: { icon: XCircle, label: "Fehlgeschlagen", variant: "destructive" },
};

interface MeetingStatusBadgeProps {
  type: "transcript" | "summary";
  status: StatusType;
}

export function MeetingStatusBadge({ type, status }: MeetingStatusBadgeProps) {
  if (!status) return null;

  const config = STATUS_CONFIG[status];
  if (!config) return null;

  const TypeIcon = type === "transcript" ? Mic : Brain;
  const StatusIcon = config.icon;
  const isProcessing = status === "processing";

  return (
    <Badge variant={config.variant} className="gap-1 text-xs">
      <TypeIcon className="h-3 w-3" />
      <StatusIcon className={`h-3 w-3 ${isProcessing ? "animate-spin" : ""}`} />
      {type === "transcript" ? "Transkript" : "Summary"}: {config.label}
    </Badge>
  );
}
