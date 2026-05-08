"use client";

import { CheckCircle2, AlertCircle, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type VatIdBadgeState =
  | "idle"
  | "checking"
  | "format-invalid"
  | "format-ok"
  | "vies-ok"
  | "vies-invalid"
  | "vies-unavailable";

interface VatIdStatusBadgeProps {
  state: VatIdBadgeState;
  message?: string;
  viesName?: string | null;
}

const STATE_CONFIG: Record<
  VatIdBadgeState,
  { label: string; icon: typeof CheckCircle2; classes: string; tooltip: string }
> = {
  "idle": {
    label: "",
    icon: Clock,
    classes: "hidden",
    tooltip: "",
  },
  "checking": {
    label: "Pruefe…",
    icon: Clock,
    classes: "bg-slate-100 text-slate-600 border-slate-200",
    tooltip: "VIES-Online-Lookup laeuft",
  },
  "format-invalid": {
    label: "Format ungueltig",
    icon: AlertCircle,
    classes: "bg-red-50 text-red-700 border-red-200",
    tooltip: "Format der VAT-ID ist nicht gueltig",
  },
  "format-ok": {
    label: "Format OK",
    icon: CheckCircle2,
    classes: "bg-amber-50 text-amber-700 border-amber-200",
    tooltip: "Format ist gueltig (kein VIES-Lookup erfolgt)",
  },
  "vies-ok": {
    label: "VIES bestaetigt",
    icon: CheckCircle2,
    classes: "bg-brand-success/10 text-brand-success-dark border-brand-success/30",
    tooltip: "Format gueltig + VIES-Online-Lookup bestaetigt",
  },
  "vies-invalid": {
    label: "VIES: ungueltig",
    icon: AlertCircle,
    classes: "bg-red-50 text-red-700 border-red-200",
    tooltip: "VIES meldet diese VAT-ID als ungueltig",
  },
  "vies-unavailable": {
    label: "VIES nicht erreichbar",
    icon: AlertTriangle,
    classes: "bg-orange-50 text-orange-700 border-orange-200",
    tooltip: "Format gueltig, aber VIES-Service ist gerade nicht verfuegbar",
  },
};

export function VatIdStatusBadge({ state, message, viesName }: VatIdStatusBadgeProps) {
  const config = STATE_CONFIG[state];
  if (state === "idle") return null;

  const Icon = config.icon;

  return (
    <div className="space-y-1">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
          config.classes
        )}
        title={message ?? config.tooltip}
      >
        <Icon size={14} strokeWidth={2.5} />
        {config.label}
      </span>
      {viesName && state === "vies-ok" && (
        <p className="text-xs text-slate-600">VIES: {viesName}</p>
      )}
      {message && (state === "format-invalid" || state === "vies-invalid") && (
        <p className="text-xs text-red-600">{message}</p>
      )}
    </div>
  );
}
