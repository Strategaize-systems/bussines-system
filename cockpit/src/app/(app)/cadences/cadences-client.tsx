"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap,
  Plus,
  MoreVertical,
  Play,
  Pause,
  Archive,
  Trash2,
  Users,
  ListOrdered,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard, KPIGrid } from "@/components/ui/kpi-card";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { Button } from "@/components/ui/button";
import type { CadenceWithSteps, CadenceStatus } from "@/types/cadence";
import { createCadence, updateCadence, deleteCadence } from "./actions";

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Aktiv", color: "bg-emerald-100 text-emerald-700" },
  paused: { label: "Pausiert", color: "bg-amber-100 text-amber-700" },
  archived: { label: "Archiviert", color: "bg-slate-100 text-slate-500" },
};

export function CadencesClient({ cadences }: { cadences: CadenceWithSteps[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    return cadences.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [cadences, statusFilter, searchQuery]);

  const activeCadences = cadences.filter((c) => c.status === "active").length;
  const totalSteps = cadences.reduce((sum, c) => sum + c.steps.length, 0);

  async function handleCreate() {
    if (!newName.trim()) return;
    setError("");
    const result = await createCadence({ name: newName.trim() });
    if (result.error) {
      setError(result.error);
      return;
    }
    setShowNewDialog(false);
    setNewName("");
    startTransition(() => router.refresh());
    if (result.id) {
      router.push(`/cadences/${result.id}`);
    }
  }

  async function handleStatusChange(id: string, status: CadenceStatus) {
    await updateCadence(id, { status });
    startTransition(() => router.refresh());
  }

  async function handleDelete(id: string) {
    const result = await deleteCadence(id);
    if (result.error) {
      setError(result.error);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automatisierungen"
        subtitle="Follow-up-Sequenzen automatisieren"
      />

      <KPIGrid>
        <KPICard label="Aktive Automatisierungen" value={activeCadences} icon={Zap} />
        <KPICard label="Gesamt-Schritte" value={totalSteps} icon={ListOrdered} />
        <KPICard label="Gesamt" value={cadences.length} icon={Users} />
      </KPIGrid>

      <FilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Automatisierung suchen..."
      >
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "Alle" },
            { value: "active", label: "Aktiv" },
            { value: "paused", label: "Pausiert" },
            { value: "archived", label: "Archiviert" },
          ]}
        />
        <Button
          onClick={() => setShowNewDialog(true)}
          className="bg-[#120774] hover:bg-[#1a0f9e] text-white"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Neue Automatisierung
        </Button>
      </FilterBar>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>
      )}

      {/* New Cadence Dialog (inline) */}
      {showNewDialog && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Neue Automatisierung erstellen</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name der Automatisierung..."
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#120774]/20 focus:border-[#120774]"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || isPending}
              className="bg-[#120774] hover:bg-[#1a0f9e] text-white"
            >
              Erstellen
            </Button>
            <Button
              variant="outline"
              onClick={() => { setShowNewDialog(false); setNewName(""); setError(""); }}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      )}

      {/* Cadence List */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Zap className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">
              {cadences.length === 0
                ? "Noch keine Automatisierungen erstellt"
                : "Keine Automatisierungen fuer diesen Filter"}
            </p>
            {cadences.length === 0 && (
              <p className="text-xs mt-1 text-slate-400">
                Erstelle deine erste Follow-up-Sequenz
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((cadence) => {
              const cfg = statusConfig[cadence.status] ?? statusConfig.active;
              return (
                <div
                  key={cadence.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
                >
                  {/* Icon */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm">
                    <Zap className="h-4.5 w-4.5 text-white" />
                  </div>

                  {/* Content */}
                  <Link href={`/cadences/${cadence.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {cadence.name}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    {cadence.description && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{cadence.description}</p>
                    )}
                  </Link>

                  {/* Stats */}
                  <div className="flex items-center gap-6 text-xs text-slate-500 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <ListOrdered className="h-3.5 w-3.5" />
                      <span>{cadence.steps.length} Schritte</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>{cadence.enrollment_count ?? 0} aktiv</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="relative shrink-0">
                    <CadenceActions
                      cadence={cadence}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CadenceActions({
  cadence,
  onStatusChange,
  onDelete,
}: {
  cadence: CadenceWithSteps;
  onStatusChange: (id: string, status: CadenceStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100"
      >
        <MoreVertical className="h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {cadence.status === "active" && (
              <button
                onClick={() => { onStatusChange(cadence.id, "paused"); setOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50"
              >
                <Pause className="h-3.5 w-3.5 text-amber-500" />
                Pausieren
              </button>
            )}
            {cadence.status === "paused" && (
              <button
                onClick={() => { onStatusChange(cadence.id, "active"); setOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50"
              >
                <Play className="h-3.5 w-3.5 text-emerald-500" />
                Aktivieren
              </button>
            )}
            {cadence.status !== "archived" && (
              <button
                onClick={() => { onStatusChange(cadence.id, "archived"); setOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50"
              >
                <Archive className="h-3.5 w-3.5 text-slate-400" />
                Archivieren
              </button>
            )}
            <button
              onClick={() => { onDelete(cadence.id); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-red-50 text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Loeschen
            </button>
          </div>
        </>
      )}
    </div>
  );
}
