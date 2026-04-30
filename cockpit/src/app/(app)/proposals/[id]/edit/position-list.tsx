"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ProposalProductPicker } from "@/components/proposal/proposal-product-picker";
import {
  reorderProposalItems,
  removeProposalItem,
  updateProposalItem,
  type ProposalItem,
} from "@/app/(app)/proposals/actions";
import {
  calculateLineTotal,
  calculateTotals,
} from "@/lib/proposal/calc";
import { useDebouncedCallback } from "@/lib/utils/use-debounce";
import type { Product } from "@/types/products";

const eur = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

type ProposalPositionListProps = {
  proposalId: string;
  items: ProposalItem[];
  taxRate: number;
  products: Product[];
  onItemsChange: (items: ProposalItem[]) => void;
};

export function ProposalPositionList({
  proposalId,
  items,
  taxRate,
  products,
  onItemsChange,
}: ProposalPositionListProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reordering, startReorderTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const totals = useMemo(
    () => calculateTotals(items, taxRate),
    [items, taxRate],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;

      const reordered = arrayMove(items, oldIndex, newIndex).map(
        (item, idx) => ({ ...item, position_order: idx + 1 }),
      );
      onItemsChange(reordered);

      const orderedIds = reordered.map((r) => r.id);
      startReorderTransition(async () => {
        const res = await reorderProposalItems(proposalId, orderedIds);
        if (!res.ok) {
          setError(res.error);
          onItemsChange(items);
        }
      });
    },
    [items, proposalId, onItemsChange],
  );

  const handleRemove = useCallback(
    (itemId: string) => {
      onItemsChange(items.filter((i) => i.id !== itemId));
      void removeProposalItem(itemId).then((res) => {
        if (!res.ok) {
          setError(res.error);
        }
      });
    },
    [items, onItemsChange],
  );

  const handlePatchItem = useCallback(
    (itemId: string, patch: Partial<ProposalItem>) => {
      onItemsChange(
        items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
      );
    },
    [items, onItemsChange],
  );

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-5 py-4 border-b-2 border-slate-200">
        <div>
          <h3 className="text-base font-bold text-slate-900">Positionen</h3>
          <p className="text-[11px] font-medium text-slate-500">
            {items.length} {items.length === 1 ? "Position" : "Positionen"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#120774] to-[#4454b8] px-3 py-2 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          Produkt
        </button>
      </div>

      {error && (
        <div className="px-4 py-2 border-b border-red-200 bg-red-50 text-xs font-bold text-red-700">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-sm text-slate-400 font-medium">
              Noch keine Positionen
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Klicke &quot;Produkt hinzufuegen&quot; oben rechts.
            </div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className={reordering ? "opacity-70 pointer-events-none" : ""}>
                {items.map((item) => (
                  <PositionRow
                    key={item.id}
                    item={item}
                    onRemove={() => handleRemove(item.id)}
                    onPatch={(patch) => handlePatchItem(item.id, patch)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="px-5 py-4 border-t-2 border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 space-y-1.5">
        <Row label="Subtotal Netto" value={eur.format(totals.subtotal)} />
        <Row label={`Steuer (${taxRate}%)`} value={eur.format(totals.tax)} />
        <div className="h-px bg-slate-200 my-1.5" />
        <Row label="Total Brutto" value={eur.format(totals.total)} bold />
      </div>

      <ProposalProductPicker
        proposalId={proposalId}
        products={products}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onAdded={(newItem) => {
          onItemsChange([...items, newItem]);
        }}
      />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className={bold ? "font-bold text-slate-900" : "text-slate-600"}>
        {label}
      </span>
      <span
        className={
          bold
            ? "text-sm font-bold text-slate-900 tabular-nums"
            : "font-semibold text-slate-700 tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
}

function PositionRow({
  item,
  onRemove,
  onPatch,
}: {
  item: ProposalItem;
  onRemove: () => void;
  onPatch: (patch: Partial<ProposalItem>) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const debouncedSave = useDebouncedCallback(
    (patch: { quantity?: number; unit_price_net?: number; discount_pct?: number }) => {
      void updateProposalItem(item.id, patch);
    },
    500,
  );

  const lineTotal = calculateLineTotal(
    item.quantity,
    item.unit_price_net,
    item.discount_pct,
  );

  function patchAndSave(patch: Partial<ProposalItem>) {
    onPatch(patch);
    const filtered: { quantity?: number; unit_price_net?: number; discount_pct?: number } = {};
    if ("quantity" in patch && typeof patch.quantity === "number") filtered.quantity = patch.quantity;
    if ("unit_price_net" in patch && typeof patch.unit_price_net === "number") filtered.unit_price_net = patch.unit_price_net;
    if ("discount_pct" in patch && typeof patch.discount_pct === "number") filtered.discount_pct = patch.discount_pct;
    debouncedSave(filtered);
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 px-3 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="mt-2 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
        aria-label="Position verschieben"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="text-sm font-bold text-slate-900 truncate" title={item.snapshot_name}>
          {item.snapshot_name}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Menge">
            <NumberInput
              value={item.quantity}
              min={1}
              step={1}
              validate={(v) => Number.isFinite(v) && v > 0}
              onCommit={(v) => patchAndSave({ quantity: v })}
              className="h-8 text-xs"
            />
          </Field>
          <Field label="Einzelpreis">
            <NumberInput
              value={item.unit_price_net}
              min={0}
              step={0.01}
              validate={(v) => Number.isFinite(v) && v >= 0}
              onCommit={(v) => patchAndSave({ unit_price_net: v })}
              className="h-8 text-xs tabular-nums"
            />
          </Field>
          <Field label="Discount %">
            <NumberInput
              value={item.discount_pct}
              min={0}
              max={100}
              step={1}
              validate={(v) => Number.isFinite(v) && v >= 0 && v <= 100}
              onCommit={(v) => patchAndSave({ discount_pct: v })}
              className="h-8 text-xs tabular-nums"
            />
          </Field>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Zwischensumme</span>
          <span className="font-bold text-slate-900 tabular-nums">
            {eur.format(lineTotal)}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          if (confirm(`Position "${item.snapshot_name}" entfernen?`)) onRemove();
        }}
        className="mt-2 text-slate-300 hover:text-red-600 transition-colors"
        aria-label="Position entfernen"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">
        {label}
      </span>
      {children}
    </label>
  );
}

// Lokaler String-State pro Number-Input, damit der User das Feld leeren und
// frei tippen kann ohne dass `Number("") === 0` den Wert blockiert oder eine
// fuehrende "0" stehen bleibt. Persist nur bei valid value; bei Blur wird der
// lokale State auf den canonical Item-State zurueckgesetzt, falls der User
// einen ungueltigen Wert getippt hat.
function NumberInput({
  value,
  min,
  max,
  step,
  validate,
  onCommit,
  className,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  validate: (v: number) => boolean;
  onCommit: (v: number) => void;
  className?: string;
}) {
  // committedValue trackt den zuletzt von extern gesehenen Wert. Aendert sich
  // value von aussen (Drag-Reorder, Server-Rollback bei Validation-Error),
  // wird der lokale Text-State neu initialisiert. React-19-Pattern: setState
  // direkt im Render-Body ist erlaubt zur Schleifen-Terminierung.
  const [text, setText] = useState(String(value));
  const [committedValue, setCommittedValue] = useState(value);

  if (committedValue !== value) {
    setCommittedValue(value);
    setText(String(value));
  }

  return (
    <Input
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={step}
      value={text}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        if (next === "") return;
        const v = Number(next);
        if (validate(v)) {
          setCommittedValue(v);
          onCommit(v);
        }
      }}
      onBlur={() => {
        const v = Number(text);
        if (text === "" || !validate(v)) {
          setText(String(value));
        }
      }}
      className={className}
    />
  );
}
