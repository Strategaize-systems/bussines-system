"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { Users, UserPlus, Handshake, Target, MapPin } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard, KPIGrid } from "@/components/ui/kpi-card";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ViewToggle } from "@/components/ui/view-toggle";
import type { ViewMode } from "@/components/ui/view-toggle";
import { EntityMapDynamic } from "@/components/map/entity-map-dynamic";
import { PlzSearch } from "@/components/map/plz-search";
import { getCoordinatesForPlz, getEntitiesInRadius, radiusToZoom } from "@/lib/geo/plz-lookup";
import type { GeoEntity } from "@/lib/geo/plz-lookup";
import { ContactSheet } from "./contact-sheet";
import type { Contact } from "./actions";
import type { SearchItem } from "@/components/ui/search-autocomplete";

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
  companies: { id: string; name: string; address_zip: string | null }[];
}

export function ContactsClient({ contacts, companies }: ContactsClientProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [showNewContact, setShowNewContact] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [plzSearch, setPlzSearch] = useState("");
  const [plzRadius, setPlzRadius] = useState(50);

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

  // Build company PLZ lookup
  const companyPlzMap = useMemo(() => {
    const map = new Map<string, string>();
    companies.forEach((c) => { if (c.address_zip) map.set(c.id, c.address_zip); });
    return map;
  }, [companies]);

  // PLZ search center
  const plzCenter = useMemo(() => {
    if (plzSearch.length === 5) return getCoordinatesForPlz(plzSearch);
    return null;
  }, [plzSearch]);

  // Geo-enrich contacts via company PLZ
  const geoEntities = useMemo(
    () => {
      const result: GeoEntity[] = [];
      for (const c of filtered) {
        const plz = c.company_id ? companyPlzMap.get(c.company_id) : null;
        const coords = getCoordinatesForPlz(plz);
        if (!coords) continue;
        result.push({
          id: c.id,
          lat: coords.lat,
          lng: coords.lng,
          label: `${c.first_name} ${c.last_name}`,
          sublabel: c.position || undefined,
          type: c.relationship_type || undefined,
        });
      }
      return result;
    },
    [filtered, companyPlzMap]
  );

  // Filter by PLZ radius
  const mapEntities = useMemo(() => {
    if (!plzCenter) return geoEntities;
    return getEntitiesInRadius(geoEntities, plzCenter, plzRadius);
  }, [geoEntities, plzCenter, plzRadius]);

  const multiplierCount = contacts.filter((c) => c.is_multiplier).length;
  const kundenCount = contacts.filter((c) => c.relationship_type === "kunde").length;

  const searchItems: SearchItem[] = useMemo(
    () =>
      contacts.map((c) => ({
        id: c.id,
        label: `${c.first_name} ${c.last_name}`,
        sublabel: [c.position, c.email].filter(Boolean).join(" · "),
        href: `/contacts/${c.id}`,
        type: c.relationship_type || "Kontakt",
      })),
    [contacts]
  );

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
            autocompleteItems={searchItems}
            actionLabel="Neuer Kontakt"
            actionIcon={UserPlus}
            onAction={() => setShowNewContact(true)}
          >
            <FilterSelect value={typeFilter} onChange={setTypeFilter} options={relationshipOptions} />
            <FilterSelect value={regionFilter} onChange={setRegionFilter} options={regionOptions} />
          </FilterBar>

          {viewMode === "karte" ? (
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-8 space-y-4">
                <PlzSearch
                  value={plzSearch}
                  onChange={setPlzSearch}
                  radiusKm={plzRadius}
                  onRadiusChange={setPlzRadius}
                />
                <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <MapPin size={16} strokeWidth={2.5} className="text-[#4454b8]" />
                      {plzCenter ? `PLZ ${plzSearch} · ${plzRadius} km` : "Karte"}
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400">
                      {mapEntities.length} Standorte
                    </span>
                  </div>
                  <div className="rounded-xl border-2 border-slate-200 overflow-hidden" style={{ height: "600px" }}>
                    <EntityMapDynamic
                      entities={mapEntities}
                      onEntityClick={(id) => router.push(`/contacts/${id}`)}
                      hoveredId={hoveredCard}
                      center={plzCenter ?? undefined}
                      zoom={plzCenter ? radiusToZoom(plzRadius) : undefined}
                    />
                  </div>
                </div>
              </div>
              <div className="col-span-4">
                <div className="sticky top-32 space-y-2 max-h-[calc(100vh-10rem)] overflow-y-auto">
                  {(plzCenter ? filtered.filter((c) => mapEntities.some((e) => e.id === c.id)) : filtered).map((contact) => (
                    <div
                      key={contact.id}
                      onClick={() => router.push(`/contacts/${contact.id}`)}
                      onMouseEnter={() => setHoveredCard(contact.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      className={`bg-white rounded-xl border-2 p-3 cursor-pointer transition-all ${
                        hoveredCard === contact.id ? "border-[#4454b8] shadow-md" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="text-sm font-bold text-slate-900">
                        {contact.first_name} {contact.last_name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {[contact.position, contact.region].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
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

              <div className="col-span-4">
                <div className="sticky top-32 space-y-4">
                  <PlzSearch
                    value={plzSearch}
                    onChange={setPlzSearch}
                    radiusKm={plzRadius}
                    onRadiusChange={setPlzRadius}
                  />
                  <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <MapPin size={16} strokeWidth={2.5} className="text-[#4454b8]" />
                        {plzCenter ? `PLZ ${plzSearch} · ${plzRadius} km` : "Karte"}
                      </h3>
                      <span className="text-[10px] font-bold text-slate-400">
                        {mapEntities.length} Standorte
                      </span>
                    </div>
                    <div className="rounded-xl border-2 border-slate-200 overflow-hidden aspect-[3/4]">
                      <EntityMapDynamic
                        entities={mapEntities}
                        onEntityClick={(id) => router.push(`/contacts/${id}`)}
                        hoveredId={hoveredCard}
                        center={plzCenter ?? undefined}
                        zoom={plzCenter ? radiusToZoom(plzRadius) : undefined}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
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
