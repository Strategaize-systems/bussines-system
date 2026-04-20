"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Save, Check } from "lucide-react";
import { upsertActivityKpiTarget } from "@/app/actions/activity-kpis";
import type { ActivityKpiKey, ActivityKpiTarget } from "@/types/activity-kpis";
import { ACTIVITY_KPI_LABELS, ACTIVITY_KPI_DEFAULTS } from "@/types/activity-kpis";

type Props = {
  targets: ActivityKpiTarget[];
};

export function ActivityKpiSettings({ targets }: Props) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState<string | null>(null);

  // Build current values from existing targets + defaults
  const currentValues: Record<string, number> = {};
  for (const d of ACTIVITY_KPI_DEFAULTS) {
    const existing = targets.find((t) => t.kpi_key === d.key);
    currentValues[d.key] = existing ? existing.daily_target : d.target;
  }

  const [values, setValues] = useState(currentValues);

  function handleSave(kpiKey: ActivityKpiKey) {
    startTransition(async () => {
      const result = await upsertActivityKpiTarget(kpiKey, values[kpiKey] ?? 0);
      if (!result.error) {
        setSaved(kpiKey);
        setTimeout(() => setSaved(null), 2000);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-500" />
          Tages-Aktivitaets-KPIs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-500 mb-4">
          Definiere deine taeglichen Sollwerte. Die IST-Werte werden automatisch aus deinen Aktivitaeten berechnet.
        </p>
        <div className="space-y-3">
          {ACTIVITY_KPI_DEFAULTS.map((d) => (
            <div key={d.key} className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700 w-36">
                {ACTIVITY_KPI_LABELS[d.key]}
              </label>
              <input
                type="number"
                min={0}
                value={values[d.key] ?? d.target}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [d.key]: parseInt(e.target.value) || 0 }))
                }
                className="w-20 rounded-md border border-slate-200 px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-400">/ Tag</span>
              <button
                onClick={() => handleSave(d.key)}
                disabled={isPending}
                className="ml-auto inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                {saved === d.key ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" />
                    Gespeichert
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3" />
                    Speichern
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-3">
          "Stagnante Deals" = aktive Deals ohne Aktivitaet seit 7+ Tagen. Sollwert = Warnschwelle.
        </p>
      </CardContent>
    </Card>
  );
}
