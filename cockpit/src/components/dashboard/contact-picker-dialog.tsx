"use client";

// SLC-666 MT-5 — Kontakt-Picker fuer Anruf-Button im Cockpit.
// Search-Input + ILIKE auf full_name + tel:-Click (V5.1-Pattern, native).

import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Phone, Search, X } from "lucide-react";

interface ContactPickerDialogProps {
  contacts: Array<{
    id: string;
    first_name: string;
    last_name: string;
    phone?: string | null;
    company_id?: string | null;
  }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactPickerDialog({ contacts, open, onOpenChange }: ContactPickerDialogProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const withPhone = contacts.filter((c) => c.phone && c.phone.length > 0);
    if (!q) return withPhone.slice(0, 50);
    return withPhone
      .filter((c) => {
        const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
        return fullName.includes(q) || (c.phone ?? "").includes(q);
      })
      .slice(0, 50);
  }, [contacts, query]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Anruf — Kontakt auswählen</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name oder Telefonnummer…"
              data-testid="contact-picker-input"
              className="w-full pl-9 pr-9 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:border-[#4454b8] focus:ring-2 focus:ring-[#4454b8]/20"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                data-testid="contact-picker-clear"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100"
                aria-label="Suche leeren"
              >
                <X size={14} className="text-slate-400" />
              </button>
            )}
          </div>

          <div
            data-testid="contact-picker-list"
            className="max-h-[60vh] overflow-y-auto rounded-lg border border-slate-200"
          >
            {filtered.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                Kein Kontakt mit Telefonnummer gefunden.
              </div>
            )}
            {filtered.map((c) => (
              <a
                key={c.id}
                href={`tel:${c.phone}`}
                data-testid={`contact-picker-result-${c.id}`}
                onClick={() => onOpenChange(false)}
                className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    {c.first_name} {c.last_name}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{c.phone}</div>
                </div>
                <Phone size={14} className="text-emerald-600 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
