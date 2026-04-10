"use client";

import { useState, useRef, useEffect } from "react";
import { Clock, Pencil } from "lucide-react";

interface TimePickerProps {
  value: string; // "HH:MM"
  onChange: (time: string) => void;
  label?: string;
  id?: string;
}

// Generate 15-min interval times from 08:00 to 20:00
const QUICK_TIMES: string[] = [];
for (let h = 8; h <= 20; h++) {
  for (let m = 0; m < 60; m += 15) {
    if (h === 20 && m > 0) break;
    QUICK_TIMES.push(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    );
  }
}

export function TimePicker({ value, onChange, label, id }: TimePickerProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const customRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [isOpen]);

  // Focus custom input when toggled
  useEffect(() => {
    if (showCustom && customRef.current) {
      customRef.current.focus();
    }
  }, [showCustom]);

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 transition-colors text-left"
      >
        <Clock className="h-4 w-4 text-slate-400 shrink-0" />
        <span className={value ? "" : "text-slate-400"}>
          {value || "Zeit wählen"}
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg p-2 max-h-[280px] overflow-y-auto">
          {/* Quick times grid */}
          {!showCustom && (
            <>
              <div className="grid grid-cols-4 gap-1">
                {QUICK_TIMES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      onChange(t);
                      setIsOpen(false);
                    }}
                    className={`text-xs py-1.5 px-1 rounded transition-colors ${
                      t === value
                        ? "bg-[#4454b8] text-white font-bold"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-100 mt-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustom(true)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#4454b8] transition-colors w-full justify-center py-1"
                >
                  <Pencil className="h-3 w-3" />
                  Andere Zeit eingeben
                </button>
              </div>
            </>
          )}

          {/* Custom time input */}
          {showCustom && (
            <div className="space-y-2">
              <input
                ref={customRef}
                type="time"
                defaultValue={value}
                onChange={(e) => {
                  if (e.target.value) {
                    onChange(e.target.value);
                  }
                }}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustom(false)}
                  className="flex-1 text-xs py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  Schnellauswahl
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustom(false);
                    setIsOpen(false);
                  }}
                  className="flex-1 text-xs py-1.5 rounded bg-[#4454b8] text-white hover:bg-[#3344a8] transition-colors"
                >
                  Fertig
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
