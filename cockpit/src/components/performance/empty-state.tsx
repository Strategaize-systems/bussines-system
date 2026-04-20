import Link from "next/link";
import { Target, Plus } from "lucide-react";

export function PerformanceEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-4">
        <Target className="h-8 w-8 text-slate-400" />
      </div>
      <h2 className="text-lg font-semibold text-slate-900">
        Noch keine Ziele definiert
      </h2>
      <p className="mt-1 text-sm text-slate-500 max-w-md">
        Lege Vertriebsziele an, um deinen Fortschritt, Prognosen und Trends hier zu sehen.
      </p>
      <Link
        href="/performance/goals"
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#120774] to-[#4454b8] px-4 py-2 text-sm font-medium text-white shadow-sm hover:shadow-md transition-all"
      >
        <Plus className="h-4 w-4" />
        Jetzt Ziele anlegen
      </Link>
    </div>
  );
}
