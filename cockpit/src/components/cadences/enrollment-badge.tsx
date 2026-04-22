"use client";

import { Zap } from "lucide-react";
import Link from "next/link";
import type { CadenceEnrollmentWithContext } from "@/types/cadence";

const statusConfig: Record<string, { label: string; dot: string }> = {
  active: { label: "Aktiv", dot: "bg-emerald-500" },
  paused: { label: "Pausiert", dot: "bg-amber-500" },
  completed: { label: "Fertig", dot: "bg-blue-500" },
  stopped: { label: "Gestoppt", dot: "bg-red-500" },
};

export function EnrollmentBadge({
  enrollments,
}: {
  enrollments: CadenceEnrollmentWithContext[];
}) {
  const active = enrollments.filter((e) => e.status === "active" || e.status === "paused");

  if (active.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {active.map((enrollment) => {
        const cfg = statusConfig[enrollment.status] ?? statusConfig.active;
        const cadenceName = enrollment.cadence?.name ?? "Automatisierung";

        return (
          <Link
            key={enrollment.id}
            href={`/cadences/${enrollment.cadence_id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 border border-violet-200 px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 transition-colors"
          >
            <Zap className="h-3 w-3" />
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {cadenceName} — Schritt {enrollment.current_step_order}
          </Link>
        );
      })}
    </div>
  );
}
