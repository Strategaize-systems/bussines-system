"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Building2,
  User,
  Calendar,
  ChevronDown,
  CalendarDays,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { moveDealToStage, updateDealValue } from "@/app/(app)/pipeline/actions";
import { getProcessChecks } from "@/lib/process-check";
import type { PipelineStage, Pipeline } from "@/app/(app)/pipeline/actions";
import type { DealProductWithName } from "@/app/actions/deal-products";
import type { Product } from "@/types/products";
import { KIBadge } from "./ki-badge";
import type { KIBadgeInfo } from "./ki-badge";
import { DealProcessCheckPill } from "./deal-process-check-pill";
import { DealEditDrawer } from "./deal-edit-drawer";

const fmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: string }
> = {
  active: {
    label: "Aktiv",
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-200",
    icon: "\u{1f525}",
  },
  won: {
    label: "Gewonnen",
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    border: "border-emerald-200",
    icon: "⭐",
  },
  lost: {
    label: "Verloren",
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-200",
    icon: "✕",
  },
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function getKIBadgesFromActivities(
  activities: any[],
): Map<string, KIBadgeInfo> {
  const badges = new Map<string, KIBadgeInfo>();
  const cutoff = Date.now() - THIRTY_DAYS_MS;

  for (const activity of activities) {
    if (activity.type !== "ai_applied") continue;

    const createdAt = new Date(activity.created_at).getTime();
    if (createdAt < cutoff) continue;

    const title: string = activity.title ?? "";
    const source: string = activity.source_type ?? "signal";

    if (title.includes("Phase") || title.includes("stage")) {
      badges.set("stage", {
        date: activity.created_at,
        source,
        detail: title.replace("KI-Vorschlag angewendet: ", ""),
      });
    } else if (title.includes("Wert") || title.includes("value")) {
      badges.set("value", {
        date: activity.created_at,
        source,
        detail: title.replace("KI-Vorschlag angewendet: ", ""),
      });
    }
  }

  return badges;
}

interface DealHeaderProps {
  deal: any;
  stages: PipelineStage[];
  activities?: any[];
  pipelines: Pipeline[];
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  referrals: { id: string; label: string }[];
  dealProducts: DealProductWithName[];
  activeProducts: Product[];
}

export function DealHeader({
  deal,
  stages,
  activities = [],
  pipelines,
  contacts,
  companies,
  referrals,
  dealProducts,
  activeProducts,
}: DealHeaderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [valueDraft, setValueDraft] = useState<string>(
    deal.value != null ? String(deal.value) : "",
  );
  const [valueError, setValueError] = useState<string | null>(null);

  const st = statusConfig[deal.status] ?? statusConfig.active;
  const stage = stages.find((s) => s.id === deal.stage_id);
  const stageName = stage?.name ?? "";
  const kiBadges = getKIBadgesFromActivities(activities);
  const processChecks = useMemo(
    () => getProcessChecks(deal, stageName),
    [deal, stageName],
  );

  const handleStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStageId = e.target.value;
    const newStageName = stages.find((s) => s.id === newStageId)?.name ?? "";
    startTransition(async () => {
      const result = await moveDealToStage(deal.id, newStageId, newStageName);
      if (result.error) {
        alert(result.error);
        e.target.value = deal.stage_id ?? "";
      } else {
        router.refresh();
      }
    });
  };

  const handleValueSubmit = () => {
    const trimmed = valueDraft.trim();
    const parsed = trimmed === "" ? null : Number(trimmed.replace(/[.,]/g, (m) => (m === "," ? "." : "")));
    if (parsed != null && (!Number.isFinite(parsed) || parsed < 0)) {
      setValueError("Ungueltiger Wert");
      return;
    }
    setValueError(null);
    startTransition(async () => {
      const result = await updateDealValue(deal.id, parsed);
      if (result.error) {
        setValueError(result.error);
        return;
      }
      setIsEditingValue(false);
      router.refresh();
    });
  };

  const handleValueCancel = () => {
    setValueDraft(deal.value != null ? String(deal.value) : "");
    setValueError(null);
    setIsEditingValue(false);
  };

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#120774] to-[#4454b8]" />

      <div className="p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <Link href="/deals">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg hover:bg-slate-100 shrink-0 mt-0.5"
              aria-label="Zurueck zu Deals"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div className="flex-1 min-w-0">
            {/* Title Row: Title + Status-Pill + Stage-Dropdown + Process-Check-Pill + Pencil + Mein-Tag-Switch */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {deal.title}
              </h1>

              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border",
                  st.bg,
                  st.text,
                  st.border,
                )}
              >
                <span>{st.icon}</span>
                {st.label}
              </span>

              {/* Stage-Dropdown direkt im Header (DEC-179: Direkt-Wechsel ohne Confirm) */}
              {stages.length > 0 && (
                <div className="relative inline-flex">
                  <select
                    value={deal.stage_id ?? ""}
                    onChange={handleStageChange}
                    disabled={isPending}
                    aria-label="Stage wechseln"
                    className="h-8 rounded-lg border border-[#4454b8]/30 bg-[#4454b8]/10 pl-2.5 pr-7 text-xs font-bold text-[#4454b8] appearance-none cursor-pointer hover:bg-[#4454b8]/20 focus:outline-none focus:ring-2 focus:ring-[#4454b8]/30 transition-colors disabled:opacity-50"
                  >
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.probability > 0 ? ` · ${s.probability}%` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-1.5 top-2 h-3.5 w-3.5 text-[#4454b8] pointer-events-none" />
                </div>
              )}

              {kiBadges.has("stage") && <KIBadge info={kiBadges.get("stage")!} />}

              <DealProcessCheckPill checks={processChecks} />

              <div className="ml-auto flex items-center gap-2">
                <DealEditDrawer
                  deal={deal}
                  stages={stages}
                  pipelines={pipelines}
                  contacts={contacts}
                  companies={companies}
                  referrals={referrals}
                  dealProducts={dealProducts}
                  activeProducts={activeProducts}
                />
                <Link
                  href="/mein-tag"
                  aria-label="Zu Mein Tag"
                  title="Zu Mein Tag"
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Mein Tag
                </Link>
              </div>
            </div>

            {/* Value + Meta Row: Wert (inline editable) + Kontakt + Firma + ExpectedCloseDate */}
            <div className="flex items-center gap-4 sm:gap-5 mt-3 flex-wrap">
              {/* Inline-editable Value */}
              {isEditingValue ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    autoFocus
                    value={valueDraft}
                    onChange={(e) => setValueDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleValueSubmit();
                      if (e.key === "Escape") handleValueCancel();
                    }}
                    disabled={isPending}
                    placeholder="EUR"
                    aria-label="Deal-Wert in EUR"
                    className="h-9 w-32 rounded-lg border-2 border-[#4454b8]/40 bg-white px-2.5 text-lg font-bold text-slate-900 focus:outline-none focus:border-[#4454b8] focus:ring-2 focus:ring-[#4454b8]/20"
                  />
                  <button
                    type="button"
                    onClick={handleValueSubmit}
                    disabled={isPending}
                    aria-label="Wert speichern"
                    className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </button>
                  <button
                    type="button"
                    onClick={handleValueCancel}
                    disabled={isPending}
                    aria-label="Bearbeitung abbrechen"
                    className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <X className="h-4 w-4" strokeWidth={3} />
                  </button>
                  {valueError && (
                    <span className="text-xs text-red-600 font-medium">{valueError}</span>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setValueDraft(deal.value != null ? String(deal.value) : "");
                    setIsEditingValue(true);
                  }}
                  aria-label="Deal-Wert bearbeiten"
                  className="inline-flex items-center gap-2 text-2xl font-bold text-slate-900 hover:text-[#4454b8] transition-colors cursor-pointer"
                >
                  {deal.value != null ? fmt.format(deal.value) : "Wert setzen"}
                  {kiBadges.has("value") && <KIBadge info={kiBadges.get("value")!} />}
                </button>
              )}

              <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                {deal.contacts && (
                  <Link
                    href={`/contacts/${deal.contacts.id}`}
                    className="flex items-center gap-1.5 hover:text-[#4454b8] transition-colors"
                  >
                    <User className="h-3.5 w-3.5" />
                    {deal.contacts.first_name} {deal.contacts.last_name}
                  </Link>
                )}
                {deal.companies && (
                  <Link
                    href={`/companies/${deal.companies.id}`}
                    className="flex items-center gap-1.5 hover:text-[#4454b8] transition-colors"
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    {deal.companies.name}
                  </Link>
                )}
                {deal.expected_close_date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Erw. Abschluss:{" "}
                    {new Date(deal.expected_close_date).toLocaleDateString("de-DE")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
