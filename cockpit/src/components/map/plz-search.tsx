"use client";

import { MapPin } from "lucide-react";

const radiusOptions = [
  { value: 10, label: "10 km" },
  { value: 25, label: "25 km" },
  { value: 50, label: "50 km" },
  { value: 100, label: "100 km" },
];

interface PlzSearchProps {
  value: string;
  onChange: (plz: string) => void;
  radiusKm: number;
  onRadiusChange: (km: number) => void;
}

export function PlzSearch({
  value,
  onChange,
  radiusKm,
  onRadiusChange,
}: PlzSearchProps) {
  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <MapPin size={16} className="text-[#4454b8]" strokeWidth={2.5} />
        <h3 className="text-sm font-bold text-slate-900">Standort-Filter</h3>
      </div>
      <div className="space-y-2">
        <div className="relative">
          <MapPin
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={14}
          />
          <input
            type="text"
            inputMode="numeric"
            maxLength={5}
            placeholder="PLZ (z.B. 10115)"
            value={value}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 5);
              onChange(v);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-lg border-2 border-slate-200 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#4454b8] focus:ring-2 focus:ring-[#4454b8]/20 transition-all"
          />
        </div>
        <select
          value={radiusKm}
          onChange={(e) => onRadiusChange(Number(e.target.value))}
          className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 text-sm font-medium text-slate-700 focus:outline-none focus:border-[#4454b8] focus:ring-2 focus:ring-[#4454b8]/20 transition-all bg-white"
        >
          {radiusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Umkreis: {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
