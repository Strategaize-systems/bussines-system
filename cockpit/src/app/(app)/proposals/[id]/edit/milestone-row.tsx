"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  PaymentMilestone,
  PaymentMilestoneTrigger,
} from "@/types/proposal-payment";

// V5.6 SLC-563 — Single-Row der Milestone-Liste.
// Desktop: 6-Spalten-Grid (Drag · Seq · Prozent · Betrag · Trigger · Tage·Label · Delete).
// Mobile: 2-zeilig (Row 1: Drag·Seq·Prozent·Betrag, Row 2: Trigger·Tage·Label·Delete).
// Tage-Input ist nur bei Trigger 'days_after_signature' sichtbar.

const eur = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

const TRIGGER_OPTIONS: { value: PaymentMilestoneTrigger; label: string }[] = [
  { value: "on_signature", label: "Bei Vertragsabschluss" },
  { value: "on_completion", label: "Bei Fertigstellung" },
  { value: "days_after_signature", label: "Tage nach Vertragsabschluss" },
  { value: "on_milestone", label: "Bei Meilenstein" },
];

type Props = {
  milestone: PaymentMilestone;
  totalGross: number;
  onChange: (next: PaymentMilestone) => void;
  onDelete: () => void;
  disabled?: boolean;
};

export function MilestoneRow({
  milestone,
  totalGross,
  onChange,
  onDelete,
  disabled = false,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: milestone.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const computedAmount =
    Number.isFinite(totalGross) && totalGross > 0
      ? (totalGross * milestone.percent) / 100
      : 0;

  const showDaysInput = milestone.due_trigger === "days_after_signature";

  function patchPercent(raw: string) {
    const v = raw === "" ? 0 : Number(raw);
    if (!Number.isFinite(v)) return;
    onChange({ ...milestone, percent: v });
  }

  function patchTrigger(value: PaymentMilestoneTrigger) {
    if (value === "days_after_signature") {
      onChange({
        ...milestone,
        due_trigger: value,
        due_offset_days: milestone.due_offset_days ?? 30,
      });
    } else {
      onChange({
        ...milestone,
        due_trigger: value,
        due_offset_days: null,
      });
    }
  }

  function patchDays(raw: string) {
    const v = raw === "" ? null : Number(raw);
    if (v !== null && (!Number.isInteger(v) || v < 0)) return;
    onChange({ ...milestone, due_offset_days: v });
  }

  function patchLabel(raw: string) {
    onChange({ ...milestone, label: raw === "" ? null : raw });
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-b border-slate-100 px-3 py-3",
        !disabled && "hover:bg-slate-50",
      )}
    >
      <div className="grid grid-cols-[auto_1fr_auto] gap-2 md:grid-cols-[auto_2.5rem_5.5rem_6.5rem_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
        {/* Drag-Handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={disabled}
          className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40 self-center"
          aria-label="Milestone verschieben"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Sequence (read-only badge) — Desktop only */}
        <span className="hidden md:inline-flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 tabular-nums h-7">
          {milestone.sequence}
        </span>

        {/* Mobile-Row-1 wraps: Sequence (inline), Prozent, Betrag */}
        <div className="grid grid-cols-[3rem_1fr_1fr] gap-2 items-center md:hidden">
          <span className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 tabular-nums h-7">
            #{milestone.sequence}
          </span>
          <PercentInput
            value={milestone.percent}
            onChange={patchPercent}
            disabled={disabled}
          />
          <span className="text-right text-xs font-semibold text-slate-700 tabular-nums">
            {eur.format(computedAmount)}
          </span>
        </div>

        {/* Desktop-Prozent */}
        <div className="hidden md:block">
          <PercentInput
            value={milestone.percent}
            onChange={patchPercent}
            disabled={disabled}
          />
        </div>
        {/* Desktop-Betrag */}
        <span className="hidden md:inline-block text-right text-xs font-semibold text-slate-700 tabular-nums">
          {eur.format(computedAmount)}
        </span>

        {/* Delete (Desktop ganz rechts; Mobile in Row 2) */}
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className="text-slate-300 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-300 hidden md:block self-center"
          aria-label="Milestone entfernen"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        {/* Trigger-Select (Desktop in Spalte 5) */}
        <select
          value={milestone.due_trigger}
          onChange={(e) =>
            patchTrigger(e.target.value as PaymentMilestoneTrigger)
          }
          disabled={disabled}
          className="hidden md:block h-9 w-full rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#4454b8] focus:ring-2 focus:ring-[#4454b8]/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {TRIGGER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Tage + Label (Desktop in Spalte 6, Sub-Grid) */}
        <div className="hidden md:grid grid-cols-[5rem_minmax(0,1fr)] gap-2">
          {showDaysInput ? (
            <Input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              placeholder="Tage"
              value={milestone.due_offset_days ?? ""}
              disabled={disabled}
              onChange={(e) => patchDays(e.target.value)}
              className="h-9 text-xs"
            />
          ) : (
            <span aria-hidden />
          )}
          <Input
            type="text"
            placeholder="Beschreibung (optional)"
            maxLength={120}
            value={milestone.label ?? ""}
            disabled={disabled}
            onChange={(e) => patchLabel(e.target.value)}
            className="h-9 text-xs"
          />
        </div>
      </div>

      {/* Mobile-Row-2: Trigger + Tage + Label + Delete */}
      <div className="mt-2 grid grid-cols-[1fr_auto] gap-2 items-center md:hidden">
        <div className="space-y-2">
          <select
            value={milestone.due_trigger}
            onChange={(e) =>
              patchTrigger(e.target.value as PaymentMilestoneTrigger)
            }
            disabled={disabled}
            className="h-9 w-full rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#4454b8] focus:ring-2 focus:ring-[#4454b8]/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {TRIGGER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-2">
            {showDaysInput ? (
              <Input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                placeholder="Tage"
                value={milestone.due_offset_days ?? ""}
                disabled={disabled}
                onChange={(e) => patchDays(e.target.value)}
                className="h-9 text-xs"
              />
            ) : (
              <span aria-hidden />
            )}
            <Input
              type="text"
              placeholder="Beschreibung (optional)"
              maxLength={120}
              value={milestone.label ?? ""}
              disabled={disabled}
              onChange={(e) => patchLabel(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className="text-slate-300 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-300 self-start"
          aria-label="Milestone entfernen"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

function PercentInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (raw: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <Input
        type="number"
        min="0.01"
        max="100"
        step="0.01"
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 pr-7 text-xs tabular-nums"
        aria-label="Prozent"
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-500">
        %
      </span>
    </div>
  );
}
