import { Badge } from "@/components/ui/badge";
import type { ConsentStatus } from "@/app/(app)/contacts/actions";

const statusConfig: Record<ConsentStatus, { label: string; className: string }> = {
  granted: {
    label: "Eingewilligt",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  pending: {
    label: "Anfrage offen",
    className: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  },
  declined: {
    label: "Abgelehnt",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
  revoked: {
    label: "Widerrufen",
    className: "bg-slate-200 text-slate-700 hover:bg-slate-200",
  },
};

export function ConsentBadge({ status }: { status: ConsentStatus }) {
  const cfg = statusConfig[status] ?? statusConfig.pending;
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}
