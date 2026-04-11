"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { MapPin, X } from "lucide-react";
import { searchLocation } from "@/lib/geo/plz-lookup";
import type { PlzMatch } from "@/lib/geo/plz-lookup";

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
  const [inputValue, setInputValue] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value changes
  useEffect(() => {
    if (!value && inputValue && selectedLabel) {
      setInputValue("");
      setSelectedLabel("");
    }
  }, [value]);

  const suggestions = useMemo(
    () => searchLocation(inputValue, 8),
    [inputValue]
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(match: PlzMatch) {
    setInputValue(match.plz);
    setSelectedLabel(`${match.plz} ${match.city}`);
    setShowDropdown(false);
    onChange(match.plz);
  }

  function handleClear() {
    setInputValue("");
    setSelectedLabel("");
    setShowDropdown(false);
    onChange("");
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <MapPin size={16} className="text-[#4454b8]" strokeWidth={2.5} />
        <h3 className="text-sm font-bold text-slate-900">Standort-Filter</h3>
      </div>
      <div className="space-y-2">
        <div className="relative" ref={containerRef}>
          <MapPin
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={14}
          />
          <input
            type="text"
            placeholder="PLZ oder Ort (z.B. 10115 oder Berlin)"
            value={selectedLabel || inputValue}
            onChange={(e) => {
              const v = e.target.value;
              setInputValue(v);
              setSelectedLabel("");
              setShowDropdown(v.length >= 2);
              // If pure numeric and 5 digits, apply directly
              if (/^\d{5}$/.test(v)) {
                onChange(v);
                setShowDropdown(false);
              } else if (v.length < 2) {
                onChange("");
              }
            }}
            onFocus={() => {
              if (inputValue.length >= 2 && !selectedLabel)
                setShowDropdown(true);
            }}
            className="w-full pl-9 pr-9 py-2 rounded-lg border-2 border-slate-200 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#4454b8] focus:ring-2 focus:ring-[#4454b8]/20 transition-all"
          />
          {(inputValue || selectedLabel) && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}

          {/* Suggestions Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white rounded-lg border-2 border-slate-200 shadow-xl max-h-48 overflow-y-auto">
              {suggestions.map((match) => (
                <button
                  key={match.plz}
                  onClick={() => handleSelect(match)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[#4454b8]/5 transition-colors flex items-center gap-2 border-b border-slate-100 last:border-0"
                >
                  <span className="font-bold text-slate-700 w-14 shrink-0">
                    {match.plz}
                  </span>
                  <span className="text-slate-500 truncate">{match.city}</span>
                </button>
              ))}
            </div>
          )}
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
