"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { ChevronDown } from "lucide-react";
import type { Product } from "@/types/products";

interface ProductSelectProps {
  products: Product[];
  excludeIds?: string[];
  onSelect: (product: Product) => void;
  placeholder?: string;
}

export function ProductSelect({
  products,
  excludeIds = [],
  onSelect,
  placeholder = "Produkt hinzufuegen...",
}: ProductSelectProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const available = products.filter(
    (p) => p.status === "active" && !excludeIds.includes(p.id),
  );

  const filtered = search
    ? available.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()),
      )
    : available;

  function handleSelect(product: Product) {
    onSelect(product);
    setSearch("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={placeholder}
          className="pr-8"
        />
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center justify-between"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(p);
              }}
            >
              <span className="font-medium">{p.name}</span>
              {p.standard_price != null && (
                <span className="text-xs text-slate-400 tabular-nums">
                  {p.standard_price.toLocaleString("de-DE", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  EUR
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && search && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="px-3 py-2 text-sm text-slate-400">
            Kein Produkt gefunden
          </div>
        </div>
      )}
    </div>
  );
}
