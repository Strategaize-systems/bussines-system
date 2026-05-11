"use client";

// SLC-663 MT-4 — Type-Ahead-Suche für /deals.
// Input → debounced fetch /api/deals/typeahead → Dropdown → Klick navigiert.

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Building2, User as UserIcon, X } from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { TypeaheadDealResult } from "@/lib/deals/typeahead";

const DEBOUNCE_MS = 200;
const MIN_CHARS = 2;

export function TypeAheadSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TypeaheadDealResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounced = useDebouncedValue(query, DEBOUNCE_MS);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const hasQuery = debounced.trim().length >= MIN_CHARS;
  const visibleResults = useMemo(
    () => (hasQuery ? results : []),
    [hasQuery, results],
  );
  const showDropdown = open && hasQuery;

  useEffect(() => {
    if (!hasQuery) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      setOpen(true);
    });
    fetch(`/api/deals/typeahead?q=${encodeURIComponent(debounced)}`)
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((json: { results: TypeaheadDealResult[] }) => {
        if (cancelled) return;
        setResults(json.results ?? []);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, hasQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  function handleSelect(deal: TypeaheadDealResult) {
    setOpen(false);
    setQuery("");
    router.push(`/deals/${deal.id}`);
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => visibleResults.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Deal, Firma oder Kontakt suchen…"
          data-testid="deals-typeahead-input"
          className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:border-[#4454b8] focus:ring-2 focus:ring-[#4454b8]/20"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setOpen(false);
            }}
            data-testid="deals-typeahead-clear"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100"
            aria-label="Suche leeren"
          >
            <X size={14} className="text-slate-400" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          data-testid="deals-typeahead-dropdown"
          className="absolute left-0 right-0 mt-1 z-50 rounded-lg border border-slate-200 bg-white shadow-lg max-h-80 overflow-auto"
        >
          {loading && visibleResults.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-500">Suche…</div>
          )}
          {!loading && visibleResults.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-500">Keine Treffer</div>
          )}
          {visibleResults.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleSelect(r)}
              data-testid={`deals-typeahead-result-${r.id}`}
              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
            >
              <div className="text-sm font-semibold text-slate-900 truncate">
                {r.title}
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                {r.company_name && (
                  <span className="flex items-center gap-1">
                    <Building2 size={11} className="text-slate-400" />
                    {r.company_name}
                  </span>
                )}
                {r.contact_name && (
                  <span className="flex items-center gap-1">
                    <UserIcon size={11} className="text-slate-400" />
                    {r.contact_name}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
