// SLC-706 MT-2 — DrilldownBanner
//
// Sticky Banner oben auf jeder `/team/[user_id]/*` Page. Macht visuell klar
// dass der Teamlead/Admin gerade eine Read-Only-Sicht auf einen Mitarbeiter
// hat. Back-Link zurueck zum eigenen Cockpit.
//
// Style: amber/orange Hintergrund-Akzent (Brand-Token), kein Style-Guide-V2-
// Bruch. Sticky-Top mit z-30 ueber dem normalen PageHeader (z-20).

import Link from "next/link";
import { Eye, ArrowLeft } from "lucide-react";

interface DrilldownBannerProps {
  targetDisplayName: string;
  targetUserId: string;
}

export function DrilldownBanner({
  targetDisplayName,
  targetUserId,
}: DrilldownBannerProps) {
  return (
    <div
      className="sticky top-0 z-30 border-b border-amber-300 bg-amber-50/95 backdrop-blur-sm"
      data-testid="drilldown-banner"
      data-target-user-id={targetUserId}
    >
      <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4 px-8 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-200/70 text-amber-800">
            <Eye className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-amber-900">
              Du siehst {targetDisplayName} (read-only)
            </div>
            <div className="text-xs text-amber-800/80">
              Aenderungen sind in dieser Ansicht deaktiviert
            </div>
          </div>
        </div>
        <Link
          href="/mein-tag"
          className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurueck zu deinem Cockpit
        </Link>
      </div>
    </div>
  );
}
