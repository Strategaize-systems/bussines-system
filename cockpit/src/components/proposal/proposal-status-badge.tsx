// V5.5 SLC-554: Status-Badge fuer Proposals.
//
// Color-Mapping aus Slice-Spec: draft=grau, sent=gruen, accepted=gruen-fett,
// rejected=rot, expired=orange. Legacy-Status (open/negotiation/won/lost)
// werden auf einen neutralen Fallback gemappt fuer alte V2-Records.

import { cn } from "@/lib/utils";

const STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  draft: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-200",
    label: "Entwurf",
  },
  sent: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    border: "border-emerald-200",
    label: "Versendet",
  },
  accepted: {
    bg: "bg-emerald-600",
    text: "text-white",
    border: "border-emerald-700",
    label: "Angenommen",
  },
  rejected: {
    bg: "bg-rose-100",
    text: "text-rose-700",
    border: "border-rose-200",
    label: "Abgelehnt",
  },
  expired: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-200",
    label: "Abgelaufen",
  },
  // Legacy V2-Stati: neutraler Fallback ohne semantische Aussage.
  open: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-200",
    label: "Offen",
  },
  negotiation: {
    bg: "bg-purple-100",
    text: "text-purple-700",
    border: "border-purple-200",
    label: "Verhandlung",
  },
  won: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    border: "border-emerald-200",
    label: "Gewonnen",
  },
  lost: {
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-200",
    label: "Verloren",
  },
};

const FALLBACK = {
  bg: "bg-slate-100",
  text: "text-slate-600",
  border: "border-slate-200",
};

type ProposalStatusBadgeProps = {
  status: string;
  className?: string;
};

export function ProposalStatusBadge({ status, className }: ProposalStatusBadgeProps) {
  const cfg = STYLE[status];
  const base = cfg ?? FALLBACK;
  const label = cfg?.label ?? status;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-md border text-[11px] font-bold uppercase tracking-wide",
        base.bg,
        base.text,
        base.border,
        className,
      )}
    >
      {label}
    </span>
  );
}
