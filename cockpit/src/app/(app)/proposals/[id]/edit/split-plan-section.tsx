"use client";

import { useCallback, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { PaymentMilestone } from "@/types/proposal-payment";

import { MilestoneRow } from "./milestone-row";
import { SumIndicator } from "./sum-indicator";

// V5.6 SLC-563 — Split-Plan Section (Toggle + Liste + Add + Sum-Indicator).
// Toggle off setzt `milestones=[]` (Confirm bei nicht-leerer Liste).
// Toggle on mit leerer Liste legt 1 leeren Milestone an (UX-Convenience).

type Props = {
  milestones: PaymentMilestone[];
  totalGross: number;
  onChange: (next: PaymentMilestone[]) => void;
  disabled?: boolean;
};

function makeEmptyMilestone(sequence: number): PaymentMilestone {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `tmp-${Date.now()}-${sequence}`,
    proposal_id: "",
    sequence,
    percent: 0,
    amount: null,
    due_trigger: "on_completion",
    due_offset_days: null,
    label: null,
    created_at: new Date().toISOString(),
  };
}

function renumberSequences(list: PaymentMilestone[]): PaymentMilestone[] {
  return list.map((m, idx) => ({ ...m, sequence: idx + 1 }));
}

export function SplitPlanSection({
  milestones,
  totalGross,
  onChange,
  disabled = false,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isOn = milestones.length > 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleToggle = useCallback(() => {
    if (disabled) return;
    if (isOn) {
      // Bei Toggle-Off mit nicht-leerer Liste: Confirm-Dialog. Toggle-Off
      // ist destruktiv — alle Milestones werden geloescht.
      setConfirmOpen(true);
    } else {
      onChange([makeEmptyMilestone(1)]);
    }
  }, [disabled, isOn, onChange]);

  const handleConfirmClear = useCallback(() => {
    setConfirmOpen(false);
    onChange([]);
  }, [onChange]);

  const handleAdd = useCallback(() => {
    if (disabled) return;
    onChange([...milestones, makeEmptyMilestone(milestones.length + 1)]);
  }, [disabled, milestones, onChange]);

  const handleDelete = useCallback(
    (id: string) => {
      if (disabled) return;
      const next = renumberSequences(milestones.filter((m) => m.id !== id));
      onChange(next);
    },
    [disabled, milestones, onChange],
  );

  const handlePatch = useCallback(
    (id: string, patched: PaymentMilestone) => {
      if (disabled) return;
      onChange(milestones.map((m) => (m.id === id ? patched : m)));
    },
    [disabled, milestones, onChange],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (disabled) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = milestones.findIndex((m) => m.id === active.id);
      const newIndex = milestones.findIndex((m) => m.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      const reordered = renumberSequences(
        arrayMove(milestones, oldIndex, newIndex),
      );
      onChange(reordered);
    },
    [disabled, milestones, onChange],
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-slate-900">Teilzahlungen</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Optional: Angebot in mehrere Milestones aufteilen.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isOn}
          aria-label="Teilzahlungen aktivieren"
          onClick={handleToggle}
          disabled={disabled}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
            disabled
              ? "cursor-not-allowed bg-slate-200 opacity-50"
              : isOn
                ? "bg-emerald-600"
                : "bg-slate-300",
          )}
        >
          <span
            className={cn(
              "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
              isOn ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </button>
      </div>

      {!isOn ? (
        <p className="mt-3 text-[11px] text-slate-500">
          Bei Aktivierung kannst du das Angebot in mehrere Milestones aufteilen
          (z.B. 50% bei Vertragsabschluss, 50% bei Fertigstellung).
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <SumIndicator milestones={milestones} />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAdd}
              disabled={disabled}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              Milestone
            </Button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={milestones.map((m) => m.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="rounded-lg border border-slate-200 bg-white">
                {milestones.map((m) => (
                  <MilestoneRow
                    key={m.id}
                    milestone={m}
                    totalGross={totalGross}
                    onChange={(next) => handlePatch(m.id, next)}
                    onDelete={() => handleDelete(m.id)}
                    disabled={disabled}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          <p className="text-[11px] text-slate-400">
            Summen muessen genau 100% ergeben. Speichern erfolgt automatisch
            sobald die Summe stimmt.
          </p>
        </div>
      )}

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) setConfirmOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Teilzahlungen deaktivieren?</DialogTitle>
            <DialogDescription>
              Alle aktuell hinterlegten Milestones werden geloescht. Diese
              Aktion kann nicht rueckgaengig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={handleConfirmClear}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              Milestones loeschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
