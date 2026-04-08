"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { Users, UserPlus, Handshake, Target, MapPin } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard, KPIGrid } from "@/components/ui/kpi-card";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ViewToggle } from "@/components/ui/view-toggle";
import { ContactSheet } from "./contact-sheet";
import type { Contact } from "./actions";

const relationshipOptions = [
  { value: "", label: "Alle Typen" },
  { value: "multiplikator", label: "Multiplikator" },
  { value: "kunde", label: "Kunde" },
  { value: "partner", label: "Partner" },
  { value: "interessent", label: "Interessent" },
  { value: "netzwerk", label: "Netzwerk" },
  { value: "empfehler", label: "Empfehler" },
];

const regionOptions = [
  { value: "", label: "Alle Regionen" },
  { value: "DACH", label: "DACH" },
  { value: "Benelux", label: "Benelux" },
  { value: "International", label: "International" },
];

interface ContactsClientProps {
  contacts: Contact[];
  companies: { id: string; name: string }[];
}

export function ContactsClient({ contacts, companies }: ContactsClientProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [showNewContact, setShowNewContact] = useState(false);

  const filtered = useMemo(() => {
    let result = contacts;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
          (c.email || "").toLowerCase().includes(q) ||
          (c.position || "").toLowerCase().includes(q)
      );
    }
    if (typeFilter) result = result.filter((c) => c.relationship_type === typeFilter);
    if (regionFilter) result = result.filter((c) => c.region === regionFilter);
    return result;
  }, [contacts, searchQuery, typeFilter, regionFilter]);

  const multiplierCount = contacts.filter((c) => c.is_multiplier).length;
  const kundenCount = contacts.filter((c) => c.relationship_type === "kunde").length;

  return (
    <div className="min-h-screen">
      <PageHeader title="Kontakte" subtitle="Beziehungsmanagement · Kontakte & Netzwerk">
        <ViewToggle mode={viewMode} onChange={setViewMode} />
      </PageHeader>

      <main className="px-8 py-8">
        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* KPI Cards */}
          <KPIGrid columns={4}>
            <KPICard label="Kontakte" value={contacts.length} icon={Users} gradient="blue" />
            <KPICard label="Multiplikatoren" value={multiplierCount} icon={Handshake} gradient="green" />
            <KPICard label="Kunden" value={kundenCount} icon={Target} gradient="yellow" />
            <KPICard label="Aktiv" value={contacts.filter((c) => c.relationship_type && c.relationship_type !== "inaktiv").length} icon={UserPlus} gradient="emerald" />
          </KPIGrid>

          {/* Filter Bar */}
          <FilterBar
            searchPlaceholder="Kontakt, Position oder E-Mail suchen..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            actionLabel="Neuer Kontakt"
            actionIcon={UserPlus}
            onAction={() => setShowNewContact(true)}
          >
            <FilterSelect value={typeFilter} onChange={setTypeFilter} options={relationshipOptions} />
            <FilterSelect value={regionFilter} onChange={setRegionFilter} options={regionOptions} />
          </FilterBar>

          {/* Contact Cards Grid */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-8">
              <div className="grid grid-cols-2 gap-6">
                {filtered.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => router.push(`/contacts/${contact.id}`)}
                    className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden hover:border-[#4454b8] hover:shadow-xl transition-all group cursor-pointer"
                  >
                    <div className="p-5 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#120774] to-[#4454b8] flex items-center justify-center text-white text-sm font-bold">
                          {contact.first_name.charAt(0)}{contact.last_name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-[#120774] transition-colors">
                            {contact.first_name} {contact.last_name}
                          </h3>
                          {contact.position && (
                            <p className="text-xs text-slate-500">{contact.position}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {contact.relationship_type && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border bg-blue-50 text-blue-700 border-blue-200">
                            {contact.relationship_type}
                          </span>
                        )}
                        {contact.is_multiplier && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border bg-purple-50 text-purple-700 border-purple-200">
                            Multiplikator
                          </span>
                        )}
                        {contact.region && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-slate-50 text-slate-600 border-slate-200">
                            <MapPin size={9} /> {contact.region}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-4 space-y-1.5">
                      {contact.email && (
                        <p className="text-xs text-slate-600 truncate">📧 {contact.email}</p>
                      )}
                      {contact.phone && (
                        <p className="text-xs text-slate-600">📞 {contact.phone}</p>
                      )}
                      {contact.companies && (
                        <p className="text-xs text-slate-500">🏢 {(contact.companies as any).name}</p>
                      )}
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="col-span-2 bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-12 text-center">
                    <Users size={40} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm font-medium text-slate-500">Keine Kontakte gefunden</p>
                  </div>
                )}
              </div>
            </div>

            {/* Map Sidebar */}
            <div className="col-span-4">
              <div className="sticky top-32 space-y-4">
                <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={16} className="text-[#4454b8]" strokeWidth={2.5} />
                    <h3 className="text-sm font-bold text-slate-900">Standort-Filter</h3>
                  </div>
                  <input
                    type="text"
                    placeholder="PLZ (z.B. 10115)"
                    className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#4454b8] focus:ring-2 focus:ring-[#4454b8]/20 transition-all"
                  />
                </div>
                <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                    <MapPin size={16} className="text-[#4454b8]" strokeWidth={2.5} />
                    Deutschland
                  </h3>
                  <div className="rounded-xl border-2 border-slate-200 bg-gradient-to-br from-blue-50/50 to-slate-50 aspect-[3/4] flex items-center justify-center">
                    <div className="text-center">
                      <MapPin size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-xs text-slate-400 font-medium">Karte wird geladen...</p>
                      <p className="text-[10px] text-slate-300 mt-1">{filtered.length} Kontakte</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showNewContact && (
        <ContactSheet
          companies={companies}
          defaultOpen
          onOpenChange={(open) => { if (!open) setShowNewContact(false); }}
        />
      )}
    </div>
  );
}
