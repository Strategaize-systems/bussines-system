"use client";

import { useState, useMemo } from "react";
import { Building2, Users, ArrowUpDown, ArrowUp, ArrowDown, Calendar, Target, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Deal, PipelineStage } from "./actions";

const fmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

type SortField = "title" | "value" | "stage" | "company" | "close_date" | "updated";
type SortDir = "asc" | "desc";

interface PipelineTableProps {
  deals: Deal[];
  stages: PipelineStage[];
  onDealClick: (deal: Deal) => void;
}

export function PipelineTable({ deals, stages, onDealClick }: PipelineTableProps) {
  const [sortField, setSortField] = useState<SortField>("value");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const stageMap = useMemo(() => {
    const m = new Map<string, PipelineStage>();
    for (const s of stages) m.set(s.id, s);
    return m;
  }, [stages]);

  const sorted = useMemo(() => {
    return [...deals].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "title":
          cmp = (a.title ?? "").localeCompare(b.title ?? "");
          break;
        case "value":
          cmp = (a.value ?? 0) - (b.value ?? 0);
          break;
        case "stage": {
          const sa = a.stage_id ? stageMap.get(a.stage_id) : null;
          const sb = b.stage_id ? stageMap.get(b.stage_id) : null;
          cmp = (sa?.sort_order ?? 0) - (sb?.sort_order ?? 0);
          break;
        }
        case "company":
          cmp = ((a.companies as any)?.name ?? "").localeCompare((b.companies as any)?.name ?? "");
          break;
        case "close_date":
          cmp = (a.expected_close_date ?? "9999").localeCompare(b.expected_close_date ?? "9999");
          break;
        case "updated":
          cmp = (a.updated_at ?? "").localeCompare(b.updated_at ?? "");
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [deals, sortField, sortDir, stageMap]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "title" || field === "company" ? "asc" : "desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="text-slate-300" />;
    return sortDir === "asc"
      ? <ArrowUp size={12} className="text-[#4454b8]" />
      : <ArrowDown size={12} className="text-[#4454b8]" />;
  };

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="bg-slate-50 border-b-2 border-slate-200">
            <Th field="title" label="Deal" sortField={sortField} onClick={toggleSort}><SortIcon field="title" /></Th>
            <Th field="stage" label="Stage" sortField={sortField} onClick={toggleSort}><SortIcon field="stage" /></Th>
            <Th field="value" label="Wert" sortField={sortField} onClick={toggleSort} align="right"><SortIcon field="value" /></Th>
            <Th field="company" label="Firma / Kontakt" sortField={sortField} onClick={toggleSort}><SortIcon field="company" /></Th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nächste Aktion</th>
            <Th field="close_date" label="Close-Datum" sortField={sortField} onClick={toggleSort}><SortIcon field="close_date" /></Th>
            <Th field="updated" label="Letztes Update" sortField={sortField} onClick={toggleSort}><SortIcon field="updated" /></Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.length > 0 ? sorted.map((deal) => {
            const stage = deal.stage_id ? stageMap.get(deal.stage_id) : null;
            const contact = deal.contacts as any;
            const company = deal.companies as any;
            const daysSinceUpdate = deal.updated_at
              ? Math.floor((Date.now() - new Date(deal.updated_at).getTime()) / 86400000)
              : 0;
            const isStagnant = daysSinceUpdate > 14;
            const isWarning = daysSinceUpdate > 7 && daysSinceUpdate <= 14;

            return (
              <tr
                key={deal.id}
                onClick={() => onDealClick(deal)}
                className="hover:bg-blue-50/50 cursor-pointer transition-colors"
              >
                {/* Title */}
                <td className="px-4 py-3">
                  <p className="font-bold text-slate-900 truncate max-w-[200px]">{deal.title}</p>
                  {deal.opportunity_type && (
                    <span className="text-[10px] text-slate-400">{deal.opportunity_type}</span>
                  )}
                </td>
                {/* Stage */}
                <td className="px-4 py-3">
                  {stage ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: stage.color || "#94a3b8" }}
                      />
                      <span className="text-xs font-medium text-slate-700 truncate">{stage.name}</span>
                      <span className="text-[10px] text-slate-400">{stage.probability}%</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                {/* Value */}
                <td className="px-4 py-3 text-right">
                  {deal.value != null ? (
                    <span className="font-bold text-emerald-600">{fmt.format(deal.value)}</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                {/* Company / Contact */}
                <td className="px-4 py-3">
                  <div className="space-y-0.5">
                    {company?.name && (
                      <p className="text-xs text-slate-700 flex items-center gap-1 truncate max-w-[180px]">
                        <Building2 size={10} className="text-slate-400 shrink-0" />
                        {company.name}
                      </p>
                    )}
                    {contact && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 truncate max-w-[180px]">
                        <Users size={10} className="text-slate-300 shrink-0" />
                        {contact.first_name} {contact.last_name}
                      </p>
                    )}
                  </div>
                </td>
                {/* Next Action */}
                <td className="px-4 py-3">
                  {deal.next_action ? (
                    <div>
                      <p className="text-xs text-blue-700 font-medium truncate max-w-[180px]">
                        {deal.next_action}
                      </p>
                      {deal.next_action_date && (
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar size={9} />
                          {new Date(deal.next_action_date + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-300">Keine</span>
                  )}
                </td>
                {/* Close Date */}
                <td className="px-4 py-3">
                  {deal.expected_close_date ? (
                    <span className="text-xs text-slate-600">
                      {new Date(deal.expected_close_date + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                {/* Last Update */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {isStagnant && <AlertTriangle size={12} className="text-red-500 shrink-0" />}
                    {isWarning && <AlertTriangle size={12} className="text-amber-500 shrink-0" />}
                    <span className={cn(
                      "text-xs",
                      isStagnant ? "text-red-600 font-bold" : isWarning ? "text-amber-600 font-medium" : "text-slate-500"
                    )}>
                      {daysSinceUpdate === 0 ? "Heute" : `vor ${daysSinceUpdate}d`}
                    </span>
                  </div>
                </td>
              </tr>
            );
          }) : (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                Keine Deals gefunden
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// Sortable table header cell
function Th({
  field,
  label,
  sortField,
  onClick,
  children,
  align,
}: {
  field: SortField;
  label: string;
  sortField: SortField;
  onClick: (field: SortField) => void;
  children: React.ReactNode;
  align?: "right";
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none transition-colors",
        align === "right" && "text-right"
      )}
      onClick={() => onClick(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {children}
      </span>
    </th>
  );
}
