// SLC-667 MT-7 — Settings-Page fuer Arbeitszeit-Range.

import { Clock } from "lucide-react";
import { getWorkingHoursSettings } from "@/lib/settings/working-hours-actions";
import { WorkingHoursForm } from "./working-hours-form";

export const dynamic = "force-dynamic";

export default async function WorkingHoursSettingsPage() {
  const initial = await getWorkingHoursSettings();

  return (
    <main className="px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Arbeitszeit</h1>
        <p className="text-sm text-muted-foreground">
          Lege Start- und End-Zeit deines Arbeitstags fest. Der Kalender zeigt
          den Arbeitstag-Bereich hervorgehoben, Termine ausserhalb werden
          gestaucht dargestellt.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm max-w-xl">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
            <Clock className="h-4 w-4 text-blue-700" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">Arbeitszeit-Range</p>
            <p className="text-xs text-slate-500">
              Beide Felder leer = kein Working-Hours-Filter im Kalender.
            </p>
          </div>
        </div>

        <WorkingHoursForm initial={initial} />
      </div>
    </main>
  );
}
