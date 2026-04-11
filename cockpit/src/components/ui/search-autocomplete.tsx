"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

export interface SearchItem {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  type?: string;
}

interface SearchAutocompleteProps {
  items: SearchItem[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minChars?: number;
  maxResults?: number;
}

export function SearchAutocomplete({
  items,
  value,
  onChange,
  placeholder = "Suchen...",
  minChars = 2,
  maxResults = 8,
}: SearchAutocompleteProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    if (value.length < minChars) return [];
    const q = value.toLowerCase();
    return items
      .filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          (item.sublabel?.toLowerCase().includes(q) ?? false)
      )
      .slice(0, maxResults);
  }, [items, value, minChars, maxResults]);

  const hasQuery = value.length >= minChars;
  const showDropdown = isOpen && hasQuery;
  const listboxId = "search-autocomplete-listbox";

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Reset active index when matches change
  useEffect(() => {
    setActiveIndex(-1);
  }, [matches]);

  const handleSelect = useCallback(
    (item: SearchItem) => {
      setIsOpen(false);
      onChange("");
      router.push(item.href);
    },
    [router, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showDropdown) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev < matches.length - 1 ? prev + 1 : 0));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : matches.length - 1));
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < matches.length) {
            handleSelect(matches[activeIndex]);
          }
          break;
        case "Escape":
          setIsOpen(false);
          inputRef.current?.blur();
          break;
      }
    },
    [showDropdown, matches, activeIndex, handleSelect]
  );

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          size={18}
          strokeWidth={2.5}
        />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full pl-10 pr-9 py-2.5 rounded-lg border-2 border-slate-200 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#4454b8] focus:ring-2 focus:ring-[#4454b8]/20 transition-all"
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-controls={showDropdown ? listboxId : undefined}
          aria-activedescendant={activeIndex >= 0 ? `search-item-${activeIndex}` : undefined}
        />
        {value && (
          <button
            onClick={() => {
              onChange("");
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label="Suche leeren"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          id={listboxId}
          className="absolute z-50 top-full mt-1 w-full bg-white rounded-xl border-2 border-slate-200 shadow-xl overflow-hidden"
          role="listbox"
        >
          {matches.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400">
              Keine Treffer
            </div>
          ) : (
            <>
              {matches.map((item, index) => {
                const initials = item.label
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w[0] ?? "")
                  .join("")
                  .toUpperCase() || "?";

                return (
                  <button
                    key={item.id}
                    id={`search-item-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${
                      index === activeIndex
                        ? "bg-[#4454b8]/10 text-slate-900"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#120774] to-[#4454b8] flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{item.label}</p>
                      {item.sublabel && (
                        <p className="text-xs text-slate-500 truncate">{item.sublabel}</p>
                      )}
                    </div>
                    {item.type && (
                      <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">
                        {item.type}
                      </span>
                    )}
                  </button>
                );
              })}
              <div className="px-4 py-1.5 text-[10px] text-slate-400 border-t border-slate-100 bg-slate-50">
                {matches.length} Treffer — Enter zum Navigieren, Esc zum Schliessen
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
