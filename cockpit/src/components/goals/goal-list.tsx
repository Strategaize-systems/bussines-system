"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Ban, RotateCcw } from "lucide-react";
import { cancelGoal, updateGoal } from "@/app/actions/goals";
import { GoalForm } from "./goal-form";
import type { GoalWithProduct } from "@/app/actions/goals";
import type { Product } from "@/types/products";
import type { GoalType, GoalPeriod, GoalStatus } from "@/types/goals";

const TYPE_LABELS: Record<GoalType, string> = {
  revenue: "Umsatz",
  deal_count: "Deals",
  win_rate: "Quote",
};

const PERIOD_LABELS: Record<GoalPeriod, string> = {
  month: "Monat",
  quarter: "Quartal",
  year: "Jahr",
};

const STATUS_STYLES: Record<GoalStatus, { label: string; color: string }> = {
  active: { label: "Aktiv", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  completed: { label: "Erreicht", color: "bg-blue-100 text-blue-700 border-blue-200" },
  cancelled: { label: "Storniert", color: "bg-slate-100 text-slate-400 border-slate-200" },
};

interface GoalListProps {
  goals: GoalWithProduct[];
  products: Product[];
}

export function GoalList({ goals, products }: GoalListProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<GoalStatus | "all">("active");
  const [isPending, startTransition] = useTransition();

  const filtered =
    filter === "all" ? goals : goals.filter((g) => g.status === filter);

  function handleCancel(goalId: string) {
    startTransition(async () => {
      await cancelGoal(goalId);
      router.refresh();
    });
  }

  function handleReactivate(goalId: string) {
    startTransition(async () => {
      await updateGoal({ id: goalId, ...({ status: "active" } as any) });
      router.refresh();
    });
  }

  function formatPeriodStart(date: string, period: GoalPeriod): string {
    const d = new Date(date);
    if (period === "year") return d.getFullYear().toString();
    if (period === "quarter") {
      const q = Math.floor(d.getMonth() / 3) + 1;
      return `Q${q} ${d.getFullYear()}`;
    }
    return d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  }

  function formatTargetValue(value: number, type: GoalType): string {
    if (type === "revenue") {
      return `${value.toLocaleString("de-DE", { minimumFractionDigits: 0 })} EUR`;
    }
    if (type === "win_rate") return `${value}%`;
    return value.toString();
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2">
        {(["all", "active", "completed", "cancelled"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === s
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s === "all" ? "Alle" : STATUS_STYLES[s].label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Typ</TableHead>
              <TableHead>Zeitraum</TableHead>
              <TableHead className="text-right">Sollwert</TableHead>
              <TableHead>Produkt</TableHead>
              <TableHead>Quelle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                  Keine Ziele gefunden
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((goal) => (
                <TableRow key={goal.id}>
                  <TableCell className="font-medium text-slate-900">
                    {TYPE_LABELS[goal.type]}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {PERIOD_LABELS[goal.period]} — {formatPeriodStart(goal.period_start, goal.period)}
                  </TableCell>
                  <TableCell className="text-right text-slate-900 tabular-nums font-medium">
                    {formatTargetValue(goal.target_value, goal.type)}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {goal.product_name || "Gesamt"}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs ${goal.source === "imported" ? "text-blue-600" : "text-slate-400"}`}>
                      {goal.source === "imported" ? "CSV" : "Manuell"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold border ${STATUS_STYLES[goal.status].color}`}
                    >
                      {STATUS_STYLES[goal.status].label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <GoalForm
                        goal={goal}
                        products={products}
                        trigger={
                          <Button variant="ghost" size="icon-sm" title="Bearbeiten">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        }
                        onSuccess={() => router.refresh()}
                      />
                      {goal.status === "active" ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Stornieren"
                          disabled={isPending}
                          onClick={() => handleCancel(goal.id)}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      ) : goal.status === "cancelled" ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Reaktivieren"
                          disabled={isPending}
                          onClick={() => handleReactivate(goal.id)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
