"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const periods = [
  { value: "month", label: "Monat" },
  { value: "quarter", label: "Quartal" },
  { value: "year", label: "Jahr" },
] as const;

export type PeriodValue = (typeof periods)[number]["value"];

export function PeriodToggle({ current }: { current: PeriodValue }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(period: PeriodValue) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    router.push(`/performance?${params.toString()}`);
  }

  return (
    <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      {periods.map((p) => (
        <button
          key={p.value}
          onClick={() => handleChange(p.value)}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
            current === p.value
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
