"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin } from "lucide-react";
import { searchLocation, type PlzMatch } from "@/lib/geo/plz-lookup";

interface PlzCityAutocompleteProps {
  /** Current PLZ value */
  plzValue: string;
  /** Current city value */
  cityValue: string;
  /** Called when PLZ changes (typed or selected) */
  onPlzChange: (plz: string) => void;
  /** Called when city changes (typed or selected) */
  onCityChange: (city: string) => void;
  /** Hidden input names for form submission */
  plzName?: string;
  cityName?: string;
}

export function PlzCityAutocomplete({
  plzValue,
  cityValue,
  onPlzChange,
  onCityChange,
  plzName = "address_zip",
  cityName = "address_city",
}: PlzCityAutocompleteProps) {
  const [plzSuggestions, setPlzSuggestions] = useState<PlzMatch[]>([]);
  const [citySuggestions, setCitySuggestions] = useState<PlzMatch[]>([]);
  const [showPlzDropdown, setShowPlzDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const plzRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (plzRef.current && !plzRef.current.contains(e.target as Node)) {
        setShowPlzDropdown(false);
      }
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setShowCityDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handlePlzInput = useCallback((value: string) => {
    onPlzChange(value);
    if (value.length >= 2) {
      const results = searchLocation(value, 8);
      setPlzSuggestions(results);
      setShowPlzDropdown(results.length > 0);
    } else {
      setPlzSuggestions([]);
      setShowPlzDropdown(false);
    }
  }, [onPlzChange]);

  const handleCityInput = useCallback((value: string) => {
    onCityChange(value);
    if (value.length >= 2) {
      const results = searchLocation(value, 8);
      setCitySuggestions(results);
      setShowCityDropdown(results.length > 0);
    } else {
      setCitySuggestions([]);
      setShowCityDropdown(false);
    }
  }, [onCityChange]);

  const selectPlzMatch = useCallback((match: PlzMatch) => {
    onPlzChange(match.plz);
    onCityChange(match.city);
    setShowPlzDropdown(false);
    setPlzSuggestions([]);
  }, [onPlzChange, onCityChange]);

  const selectCityMatch = useCallback((match: PlzMatch) => {
    onPlzChange(match.plz);
    onCityChange(match.city);
    setShowCityDropdown(false);
    setCitySuggestions([]);
  }, [onPlzChange, onCityChange]);

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* PLZ Field */}
      <div className="space-y-2" ref={plzRef}>
        <label htmlFor={plzName} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          PLZ
        </label>
        <div className="relative">
          <input
            type="text"
            id={plzName}
            name={plzName}
            value={plzValue}
            onChange={(e) => handlePlzInput(e.target.value)}
            onFocus={() => {
              if (plzSuggestions.length > 0) setShowPlzDropdown(true);
            }}
            placeholder="z.B. 40213"
            autoComplete="off"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          {showPlzDropdown && plzSuggestions.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border-2 border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {plzSuggestions.map((match) => (
                <button
                  key={match.plz}
                  type="button"
                  onClick={() => selectPlzMatch(match)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[#4454b8]/5 transition-colors flex items-center gap-2"
                >
                  <MapPin size={12} className="text-[#4454b8] shrink-0" />
                  <span className="font-bold text-slate-700">{match.plz}</span>
                  <span className="text-slate-500">{match.city}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* City Field */}
      <div className="col-span-2 space-y-2" ref={cityRef}>
        <label htmlFor={cityName} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Ort
        </label>
        <div className="relative">
          <input
            type="text"
            id={cityName}
            name={cityName}
            value={cityValue}
            onChange={(e) => handleCityInput(e.target.value)}
            onFocus={() => {
              if (citySuggestions.length > 0) setShowCityDropdown(true);
            }}
            placeholder="z.B. Düsseldorf"
            autoComplete="off"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          {showCityDropdown && citySuggestions.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border-2 border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {citySuggestions.map((match) => (
                <button
                  key={match.plz}
                  type="button"
                  onClick={() => selectCityMatch(match)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[#4454b8]/5 transition-colors flex items-center gap-2"
                >
                  <MapPin size={12} className="text-[#4454b8] shrink-0" />
                  <span className="text-slate-500">{match.plz}</span>
                  <span className="font-bold text-slate-700">{match.city}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
