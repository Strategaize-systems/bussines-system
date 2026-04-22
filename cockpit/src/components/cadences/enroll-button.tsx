"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Zap, X } from "lucide-react";
import { enrollInCadence } from "@/app/(app)/cadences/enrollment-actions";
import { getCadences } from "@/app/(app)/cadences/actions";
import type { CadenceWithSteps } from "@/types/cadence";

export function EnrollButton({
  dealId,
  contactId,
}: {
  dealId?: string;
  contactId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDialog, setShowDialog] = useState(false);
  const [cadences, setCadences] = useState<CadenceWithSteps[]>([]);
  const [selectedCadenceId, setSelectedCadenceId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (showDialog) {
      setLoading(true);
      getCadences("active").then((data) => {
        setCadences(data);
        setLoading(false);
        if (data.length > 0 && !selectedCadenceId) {
          setSelectedCadenceId(data[0].id);
        }
      });
    }
  }, [showDialog]);

  async function handleEnroll() {
    if (!selectedCadenceId) return;
    setError("");

    const result = await enrollInCadence({
      cadenceId: selectedCadenceId,
      dealId: dealId || undefined,
      contactId: contactId || undefined,
    });

    if (result.error) {
      setError(result.error);
      return;
    }

    setShowDialog(false);
    setSelectedCadenceId("");
    startTransition(() => router.refresh());
  }

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="flex items-center gap-2.5 h-10 px-4 rounded-lg border-2 border-slate-200 bg-white text-sm font-bold text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:shadow-md transition-all cursor-pointer"
      >
        <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
          <Zap className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
        </span>
        Automatisierung
      </button>

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">In Automatisierung einbuchen</h3>
              <button
                onClick={() => { setShowDialog(false); setError(""); }}
                className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500 py-4">Lade Automatisierungen...</p>
            ) : cadences.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">
                Keine aktiven Automatisierungen vorhanden. Erstelle zuerst eine Automatisierung.
              </p>
            ) : (
              <>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Automatisierung auswaehlen</label>
                <select
                  value={selectedCadenceId}
                  onChange={(e) => setSelectedCadenceId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#120774]/20 focus:border-[#120774] mb-4"
                >
                  {cadences.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.steps.length} Schritte)
                    </option>
                  ))}
                </select>

                {error && (
                  <p className="text-xs text-red-600 mb-3">{error}</p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleEnroll}
                    disabled={isPending || !selectedCadenceId}
                    className="flex-1 rounded-lg bg-[#120774] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a0f9e] transition-colors disabled:opacity-50"
                  >
                    {isPending ? "Einbuchen..." : "Einbuchen"}
                  </button>
                  <button
                    onClick={() => { setShowDialog(false); setError(""); }}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Abbrechen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
