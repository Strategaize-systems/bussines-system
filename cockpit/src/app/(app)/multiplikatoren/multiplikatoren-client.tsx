"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { Handshake, Users, Shield, Star, MapPin, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard, KPIGrid } from "@/components/ui/kpi-card";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ViewToggle } from "@/components/ui/view-toggle";
import { ContactSheet } from "../contacts/contact-sheet";
import type { Contact } from "../contacts/actions";

const typeOptions = [
  { value: "", label: "Alle Typen" },
  { value: "berater", label: "Berater" },
  { value: "banker", label: "Banker" },
  { value: "anwalt", label: "Anwalt" },
  { value: "steuerberater", label: "Steuerberater" },
  { value: "makler", label: "Makler" },
  { value: "branchenexperte", label: "Branchenexperte" },
];

const trustOptions = [
  { value: "", label: "Alle Vertrauen" },
  { value: "hoch", label: "Hoch" },
  { value: "mittel", label: "Mittel" },
  { value: "niedrig", label: "Niedrig" },
];

interface MultiplikatorenClientProps {
  multipliers: Contact[];
  companies: { id: string; name: string }[];
}

export function MultiplikatorenClient({ multipliers, companies }: MultiplikatorenClientProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [trustFilter, setTrustFilter] = useState("");
  const [showNewContact, setShowNewContact] = useState(false);

  const filtered = useMemo(() => {
    let result = multipliers;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
          (m.multiplier_type || "").toLowerCase().includes(q)
      );
    }
    if (typeFilter) result = result.filter((m) => m.multiplier_type === typeFilter);
    if (trustFilter) result = result.filter((m) => m.trust_level === trustFilter);
    return result;
  }, [multipliers, searchQuery, typeFilter, trustFilter]);

  const highTrust = multipliers.filter((m) => m.trust_level === "hoch").length;
  const highReferral = multipliers.filter((m) => m.referral_capability === "hoch").length;

  return (
    <div className="min-h-screen">
      <PageHeader title="Multiplikatoren" subtitle="Beziehungsmanagement · Steuerberater, Banker, Verbände">
        <ViewToggle mode={viewMode} onChange={setViewMode} />
      </PageHeader>

      <main className="px-8 py-8">
        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* KPI Cards */}
          <KPIGrid columns={4}>
            <KPICard label="Multiplikatoren" value={multipliers.length} icon={Handshake} gradient="blue" />
            <KPICard label="Hohes Vertrauen" value={highTrust} icon={Shield} gradient="green" />
            <KPICard label="Hohe Empfehlungsfähigkeit" value={highReferral} icon={Star} gradient="yellow" />
            <KPICard label="Aktiv" value={multipliers.filter((m) => m.relationship_type && m.relationship_type !== "inaktiv").length} icon={Users} gradient="emerald" />
          </KPIGrid>

          {/* Filter Bar */}
          <FilterBar
            searchPlaceholder="Multiplikator suchen..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            actionLabel="Multiplikator"
            actionIcon={UserPlus}
            onAction={() => setShowNewContact(true)}
          >
            <FilterSelect value={typeFilter} onChange={setTypeFilter} options={typeOptions} />
            <FilterSelect value={trustFilter} onChange={setTrustFilter} options={trustOptions} />
          </FilterBar>

          {/* Cards Grid */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-8">
              <div className="grid grid-cols-2 gap-6">
                {filtered.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => router.push(`/contacts/${m.id}`)}
                    className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden hover:border-[#4454b8] hover:shadow-xl transition-all group cursor-pointer"
                  >
                    <div className="p-5 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                          {m.first_name.charAt(0)}{m.last_name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-[#120774] transition-colors">
                            {m.first_name} {m.last_name}
                          </h3>
                          {m.position && <p className="text-xs text-slate-500">{m.position}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {m.multiplier_type && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border bg-purple-50 text-purple-700 border-purple-200">
                            {m.multiplier_type}
                          </span>
                        )}
                        {m.trust_level && (
                          <TrustBadge level={m.trust_level} />
                        )}
                        {m.referral_capability && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border bg-amber-50 text-amber-700 border-amber-200">
                            ⭐ Empf: {m.referral_capability}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-4 space-y-1.5">
                      {m.companies && (
                        <p className="text-xs text-slate-600">🏢 {(m.companies as any).name}</p>
                      )}
                      {m.email && <p className="text-xs text-slate-600 truncate">📧 {m.email}</p>}
                      {m.region && (
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin size={10} /> {m.region}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="col-span-2 bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-12 text-center">
                    <Handshake size={40} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm font-medium text-slate-500">Keine Multiplikatoren gefunden</p>
                  </div>
                )}
              </div>
            </div>

            {/* Map Sidebar */}
            <div className="col-span-4">
              <div className="sticky top-32 space-y-4">
                <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                    <MapPin size={16} className="text-[#4454b8]" strokeWidth={2.5} />
                    Deutschland
                  </h3>
                  <div className="rounded-xl border-2 border-slate-200 bg-gradient-to-br from-blue-50/50 to-slate-50 aspect-[3/4] flex items-center justify-center">
                    <div className="text-center">
                      <MapPin size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-xs text-slate-400 font-medium">Karte wird geladen...</p>
                      <p className="text-[10px] text-slate-300 mt-1">{filtered.length} Multiplikatoren</p>
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

function TrustBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    hoch: "bg-emerald-50 text-emerald-700 border-emerald-200",
    mittel: "bg-blue-50 text-blue-700 border-blue-200",
    niedrig: "bg-slate-50 text-slate-600 border-slate-200",
    unbekannt: "bg-slate-50 text-slate-400 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${styles[level] || styles.unbekannt}`}>
      🛡️ Vertrauen: {level}
    </span>
  );
}
