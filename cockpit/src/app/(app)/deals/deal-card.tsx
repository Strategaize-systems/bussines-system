"use client";

// SLC-663 MT-3 — Wiederverwendbare Deal-Karte (kompakt, kein Avatar).
// Wird auf /deals im Top-10-Block, Karten-Grid und Won/Lost-Sektionen verwendet.

import { Building2, ArrowRight, Percent } from "lucide-react";
import type { DealCardData } from "@/lib/deals/queries";
import { formatCurrency, formatDueDate } from "@/lib/deals/format";

interface DealCardProps {
  deal: DealCardData;
  onClick: () => void;
}

export function DealCard({ deal, onClick }: DealCardProps) {
  const dueLabel = formatDueDate(deal.next_action_date);
  const stageColor = deal.stage_color || "#4454b8";
  const overdue = dueLabel === "überfällig";

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="deal-card"
      className="group w-full text-left rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-[#4454b8]/40 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-[#120774]">
          {deal.title}
        </h4>
        <span className="text-sm font-bold text-slate-900 shrink-0 whitespace-nowrap">
          {formatCurrency(deal.value)}
        </span>
      </div>

      {deal.company_name && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
          <Building2 size={12} className="text-slate-400 shrink-0" />
          <span className="truncate">{deal.company_name}</span>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {deal.stage_name && (
          <span
            data-testid="deal-card-stage"
            className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border"
            style={{
              backgroundColor: `${stageColor}15`,
              color: stageColor,
              borderColor: `${stageColor}33`,
            }}
          >
            {deal.stage_name}
          </span>
        )}
        <span
          data-testid="deal-card-probability"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
        >
          <Percent size={10} />
          {deal.probability}%
        </span>
      </div>

      {deal.next_action_title && (
        <div
          data-testid="deal-card-next-action"
          className="mt-2.5 flex items-center gap-1.5 text-xs"
        >
          <ArrowRight
            size={11}
            className={overdue ? "text-red-500 shrink-0" : "text-[#4454b8] shrink-0"}
          />
          <span className="text-slate-600 font-medium truncate">
            {deal.next_action_title}
          </span>
          {dueLabel && (
            <span
              className={
                overdue
                  ? "text-[10px] font-bold text-red-600 shrink-0"
                  : "text-[10px] text-slate-400 shrink-0"
              }
            >
              {dueLabel}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
