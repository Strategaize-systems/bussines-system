"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProductSelect } from "@/components/products/product-select";
import { createGoal, updateGoal } from "@/app/actions/goals";
import type { GoalWithProduct, CreateGoalInput, UpdateGoalInput } from "@/app/actions/goals";
import type { Product } from "@/types/products";
import type { GoalType, GoalPeriod } from "@/types/goals";

const TYPE_LABELS: Record<GoalType, string> = {
  revenue: "Umsatz (EUR)",
  deal_count: "Deal-Anzahl",
  win_rate: "Abschlussquote (%)",
};

const PERIOD_LABELS: Record<GoalPeriod, string> = {
  month: "Monat",
  quarter: "Quartal",
  year: "Jahr",
};

interface GoalFormProps {
  goal?: GoalWithProduct;
  products: Product[];
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export function GoalForm({ goal, products, trigger, onSuccess }: GoalFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [type, setType] = useState<GoalType>(goal?.type ?? "revenue");
  const [period, setPeriod] = useState<GoalPeriod>(goal?.period ?? "year");
  const [periodStart, setPeriodStart] = useState(goal?.period_start ?? "");
  const [targetValue, setTargetValue] = useState(goal?.target_value?.toString() ?? "");
  const [productId, setProductId] = useState<string | null>(goal?.product_id ?? null);
  const [productName, setProductName] = useState(goal?.product_name ?? "");
  const [notes, setNotes] = useState(goal?.notes ?? "");

  useEffect(() => {
    if (open) {
      setType(goal?.type ?? "revenue");
      setPeriod(goal?.period ?? "year");
      setPeriodStart(goal?.period_start ?? "");
      setTargetValue(goal?.target_value?.toString() ?? "");
      setProductId(goal?.product_id ?? null);
      setProductName(goal?.product_name ?? "");
      setNotes(goal?.notes ?? "");
      setError("");
    }
  }, [open, goal]);

  function handleSubmit() {
    setError("");
    startTransition(async () => {
      if (goal) {
        const input: UpdateGoalInput = {
          id: goal.id,
          type,
          period,
          period_start: periodStart,
          target_value: parseFloat(targetValue),
          product_id: productId,
          notes,
        };
        const result = await updateGoal(input);
        if (result.error) {
          setError(result.error);
          return;
        }
      } else {
        const input: CreateGoalInput = {
          type,
          period,
          period_start: periodStart,
          target_value: parseFloat(targetValue),
          product_id: productId,
          notes: notes || undefined,
        };
        const result = await createGoal(input);
        if (result.error) {
          setError(result.error);
          return;
        }
      }
      setOpen(false);
      onSuccess?.();
    });
  }

  function handleProductSelect(product: Product) {
    setProductId(product.id);
    setProductName(product.name);
  }

  function clearProduct() {
    setProductId(null);
    setProductName("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<span />}>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {goal ? "Ziel bearbeiten" : "Neues Ziel"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type */}
          <div>
            <Label>Typ</Label>
            <div className="flex gap-2 mt-1">
              {(Object.keys(TYPE_LABELS) as GoalType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    type === t
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Period */}
          <div>
            <Label>Zeitraum</Label>
            <div className="flex gap-2 mt-1">
              {(Object.keys(PERIOD_LABELS) as GoalPeriod[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    period === p
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Period Start */}
          <div>
            <Label htmlFor="goal-period-start">Zeitraum-Start</Label>
            <Input
              id="goal-period-start"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
          </div>

          {/* Target Value */}
          <div>
            <Label htmlFor="goal-target">
              Sollwert {type === "revenue" ? "(EUR)" : type === "win_rate" ? "(%)" : ""}
            </Label>
            <Input
              id="goal-target"
              type="number"
              step={type === "win_rate" ? "1" : "0.01"}
              min="0"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder={type === "revenue" ? "500000" : type === "deal_count" ? "15" : "30"}
            />
          </div>

          {/* Product (optional) */}
          <div>
            <Label>Produkt (optional)</Label>
            {productId ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-slate-700">{productName}</span>
                <button
                  type="button"
                  onClick={clearProduct}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  (entfernen)
                </button>
              </div>
            ) : (
              <div className="mt-1">
                <ProductSelect
                  products={products}
                  onSelect={handleProductSelect}
                  placeholder="Gesamtziel (kein Produkt)"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="goal-notes">Notizen</Label>
            <Input
              id="goal-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Speichern..." : goal ? "Aktualisieren" : "Erstellen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
