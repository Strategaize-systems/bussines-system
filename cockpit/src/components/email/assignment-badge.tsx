import { Crosshair, Sparkles, UserCheck, HelpCircle } from "lucide-react";
import type { AssignmentSource } from "@/types/email";

interface AssignmentBadgeProps {
  source: AssignmentSource | null;
  confidence: number | null;
}

const config: Record<
  string,
  { label: string; color: string; icon: typeof Crosshair }
> = {
  exact_match: {
    label: "Exact",
    color: "bg-emerald-50 text-emerald-700",
    icon: Crosshair,
  },
  domain_match: {
    label: "Domain",
    color: "bg-blue-50 text-blue-700",
    icon: Crosshair,
  },
  ki_match: {
    label: "KI",
    color: "bg-violet-50 text-violet-700",
    icon: Sparkles,
  },
  manual: {
    label: "Manual",
    color: "bg-slate-100 text-slate-600",
    icon: UserCheck,
  },
};

/**
 * Badge showing how an inbound email was assigned to a contact.
 * "Exact", "Domain", "KI 85%", "Manual", or "Nicht zugeordnet"
 */
export function AssignmentBadge({ source, confidence }: AssignmentBadgeProps) {
  if (!source) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600">
        <HelpCircle size={9} />
        Nicht zugeordnet
      </span>
    );
  }

  const cfg = config[source];
  if (!cfg) return null;

  const Icon = cfg.icon;
  const label =
    source === "ki_match" && confidence
      ? `KI ${Math.round(confidence * 100)}%`
      : cfg.label;

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${cfg.color}`}
    >
      <Icon size={9} />
      {label}
    </span>
  );
}
