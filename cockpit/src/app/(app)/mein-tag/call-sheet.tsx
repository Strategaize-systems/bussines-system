"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Phone, Search, Building2, User } from "lucide-react";

interface CallSheetProps {
  contacts: { id: string; first_name: string; last_name: string; phone?: string | null; company_name?: string | null }[];
  trigger?: React.ReactNode;
}

export function CallSheet({ contacts, trigger }: CallSheetProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = contacts.filter((c) => {
    if (!search) return true;
    const name = `${c.first_name} ${c.last_name}`.toLowerCase();
    const company = (c.company_name ?? "").toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || company.includes(q);
  }).slice(0, 10);

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(""); }}>
      <SheetTrigger>
        {trigger}
      </SheetTrigger>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Phone size={18} className="text-orange-500" />
            Anruf starten
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Kontakt suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          {/* Contact list */}
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((contact) => (
                <div
                  key={contact.id}
                  className="rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                        <User size={12} className="text-slate-400" />
                        {contact.first_name} {contact.last_name}
                      </p>
                      {contact.company_name && (
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Building2 size={10} className="text-slate-400" />
                          {contact.company_name}
                        </p>
                      )}
                    </div>
                    {contact.phone ? (
                      <a
                        href={`tel:${contact.phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-bold hover:shadow-md transition-all"
                        onClick={() => setOpen(false)}
                      >
                        <Phone size={12} />
                        {contact.phone}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Keine Nummer</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Phone size={24} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">
                  {search ? "Kein Kontakt gefunden" : "Kontakt suchen zum Anrufen"}
                </p>
              </div>
            )}
          </div>

          <p className="text-[10px] text-slate-400 text-center">
            VoIP-Integration folgt in einer zukünftigen Version
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
