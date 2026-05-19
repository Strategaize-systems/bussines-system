"use client";

// SLC-666 MT-6 — KI-Analyse-Cockpit Client.
// 2/3+1/3 Layout: KIWorkspace links, Tages-Kalender rechts.

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { CockpitActionBar } from "@/components/dashboard/cockpit-action-bar";
import { CockpitKIWorkspace } from "@/components/dashboard/cockpit-ki-workspace";
import { Calendar, ChevronRight } from "lucide-react";
import type { CalendarSlot } from "@/app/(app)/mein-tag/actions";
import type { CustomReportRow } from "@/lib/custom-reports/types";

interface DashboardClientProps {
  userId: string;
  contacts: Array<{
    id: string;
    first_name: string;
    last_name: string;
    phone?: string | null;
    email?: string | null;
    company_id?: string | null;
  }>;
  companies: Array<{ id: string; name: string }>;
  deals: Array<{ id: string; title: string }>;
  calendarSlots: CalendarSlot[];
  // V7.6 SLC-763 — Custom-Reports der eingeloggten User fuer "cockpit"-Scope.
  customReports?: CustomReportRow[];
}

export function DashboardClient({
  userId,
  contacts,
  companies,
  deals,
  calendarSlots,
  customReports = [],
}: DashboardClientProps) {
  return (
    <div className="min-h-screen">
      <PageHeader
        title="KI-Analyse-Cockpit"
        subtitle="Geschäftsleitung · Pipeline, Forecast, Win/Loss"
      />

      <main className="px-4 md:px-8 py-6 md:py-8">
        <div className="max-w-[1800px] mx-auto space-y-6">
          <CockpitActionBar contacts={contacts} companies={companies} deals={deals} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2" data-testid="cockpit-ki-workspace-column">
              <CockpitKIWorkspace userId={userId} customReports={customReports} />
            </div>

            <aside className="lg:col-span-1" data-testid="cockpit-calendar-column">
              <CalendarColumn slots={calendarSlots} />
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

function CalendarColumn({ slots }: { slots: CalendarSlot[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-[#4454b8]" />
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
            Heute
          </h3>
        </div>
        <Link
          href="/kalender"
          className="text-xs font-semibold text-[#4454b8] hover:underline inline-flex items-center gap-0.5"
        >
          Kalender <ChevronRight size={12} />
        </Link>
      </div>

      <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
        {slots.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">
            Keine Termine heute.
          </p>
        ) : (
          slots.map((s) => (
            <div
              key={s.id}
              data-testid={`cockpit-calendar-slot-${s.id}`}
              className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50"
            >
              <div
                className={`mt-1 w-2 h-2 rounded-full shrink-0 ${s.color}`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 tabular-nums">
                    {s.time}
                  </span>
                  <span className="text-xs text-slate-900 truncate flex-1">
                    {s.title}
                  </span>
                </div>
                {s.sub && (
                  <p className="text-[10px] text-slate-500 truncate">{s.sub}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
