"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { Building2, Smile, Euro, TrendingUp, MapPin } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard, KPIGrid } from "@/components/ui/kpi-card";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ViewToggle } from "@/components/ui/view-toggle";
import type { ViewMode } from "@/components/ui/view-toggle";
import { EntityMapDynamic } from "@/components/map/entity-map-dynamic";
import { PlzSearch } from "@/components/map/plz-search";
import { getCoordinatesForPlz, getEntitiesInRadius, radiusToZoom } from "@/lib/geo/plz-lookup";
import type { GeoEntity } from "@/lib/geo/plz-lookup";
import { CompanySheet } from "./company-sheet";
import type { CompanyEnriched, CompanyStats } from "./actions";
import type { SearchItem } from "@/components/ui/search-autocomplete";

const fmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const statusOptions = [
  { value: "", label: "Alle Status" },
  { value: "ideal", label: "Ideal" },
  { value: "gut", label: "Gut" },
  { value: "möglich", label: "Möglich" },
  { value: "ungeeignet", label: "Ungeeignet" },
];

const regionOptions = [
  { value: "", label: "Alle Regionen" },
  { value: "Nord", label: "Nord" },
  { value: "Ost", label: "Ost" },
  { value: "West", label: "West" },
  { value: "Süd", label: "Süd" },
  { value: "Süd-West", label: "Süd-West" },
  { value: "Süd-Ost", label: "Süd-Ost" },
];

const potentialOptions = [
  { value: "", label: "Nach Potenzial" },
  { value: "hoch", label: "Hoch" },
  { value: "mittel", label: "Mittel" },
  { value: "niedrig", label: "Niedrig" },
];

interface CompaniesClientProps {
  companies: CompanyEnriched[];
  stats: CompanyStats;
}

export function CompaniesClient({ companies, stats }: CompaniesClientProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [potentialFilter, setPotentialFilter] = useState("");
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [plzSearch, setPlzSearch] = useState("");
  const [plzRadius, setPlzRadius] = useState(50);

  const searchItems: SearchItem[] = useMemo(
    () =>
      companies.map((c) => ({
        id: c.id,
        label: c.name,
        sublabel: [c.industry, c.region].filter(Boolean).join(" · "),
        href: `/companies/${c.id}`,
        type: c.blueprint_fit || "Firma",
      })),
    [companies]
  );

  const filtered = useMemo(() => {
    let result = companies;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.industry || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      result = result.filter((c) => c.blueprint_fit === statusFilter);
    }
    if (regionFilter) {
      result = result.filter((c) => c.region === regionFilter);
    }
    if (potentialFilter) {
      result = result.filter((c) => c.budget_potential === potentialFilter);
    }
    return result;
  }, [companies, searchQuery, statusFilter, regionFilter, potentialFilter]);

  // PLZ search center
  const plzCenter = useMemo(() => {
    if (plzSearch.length >= 4) return getCoordinatesForPlz(plzSearch);
    return null;
  }, [plzSearch]);

  // Geo-enrich filtered companies
  const geoEntities = useMemo(
    () => {
      const result: GeoEntity[] = [];
      for (const c of filtered) {
        const coords = getCoordinatesForPlz(c.address_zip);
        if (!coords) continue;
        result.push({
          id: c.id,
          lat: coords.lat,
          lng: coords.lng,
          label: c.name,
          sublabel: [c.address_zip, c.address_city].filter(Boolean).join(" "),
          type: c.blueprint_fit || undefined,
        });
      }
      return result;
    },
    [filtered]
  );

  // Filter by PLZ radius when search is active
  const mapEntities = useMemo(() => {
    if (!plzCenter) return geoEntities;
    return getEntitiesInRadius(geoEntities, plzCenter, plzRadius);
  }, [geoEntities, plzCenter, plzRadius]);

  return (
    <div className="min-h-screen">
      <PageHeader title="Firmen" subtitle="Unternehmensmanagement · Leads, Pipeline & Kunden">
        <ViewToggle mode={viewMode} onChange={setViewMode} />
      </PageHeader>

      <main className="px-8 py-8">
        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* KPI Cards */}
          <KPIGrid columns={4}>
            <KPICard
              label="Firmen"
              value={stats.total}
              icon={Building2}
              gradient="blue"
            />
            <KPICard
              label="Umsatzpotenzial"
              value={fmt.format(stats.totalPotential)}
              icon={Euro}
              gradient="green"
            />
            <KPICard
              label="Pipeline-Wert"
              value={fmt.format(stats.pipelineValue)}
              icon={TrendingUp}
              gradient="yellow"
            />
            <KPICard
              label="Kunden"
              value={stats.kundenCount}
              icon={Smile}
              gradient="emerald"
            />
          </KPIGrid>

          {/* Filter Bar */}
          <FilterBar
            searchPlaceholder="Firma oder Branche suchen..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            autocompleteItems={searchItems}
            actionLabel="Neue Firma"
            actionIcon={Building2}
            onAction={() => setShowNewCompany(true)}
          >
            <FilterSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
            <FilterSelect value={regionFilter} onChange={setRegionFilter} options={regionOptions} />
            <FilterSelect value={potentialFilter} onChange={setPotentialFilter} options={potentialOptions} />
          </FilterBar>

          {viewMode === "karte" ? (
            /* Full Map View: Map (8 cols) + List (4 cols) */
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
                      onEntityClick={(id) => router.push(`/companies/${id}`)}
                      hoveredId={hoveredCard}
                      center={plzCenter ?? undefined}
                      zoom={plzCenter ? radiusToZoom(plzRadius) : undefined}
                    />
                  </div>
                </div>
              </div>
              <div className="col-span-4">
                <div className="sticky top-32 space-y-2 max-h-[calc(100vh-10rem)] overflow-y-auto">
                  {(plzCenter ? filtered.filter((c) => mapEntities.some((e) => e.id === c.id)) : filtered).map((company) => (
                    <div
                      key={company.id}
                      onClick={() => router.push(`/companies/${company.id}`)}
                      onMouseEnter={() => setHoveredCard(company.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      className={`bg-white rounded-xl border-2 p-3 cursor-pointer transition-all ${
                        hoveredCard === company.id ? "border-[#4454b8] shadow-md" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="text-sm font-bold text-slate-900">{company.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {[company.address_zip, company.address_city].filter(Boolean).join(" ")}
                      </div>
                      {company.blueprint_fit && (
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          company.blueprint_fit === "ideal" ? "bg-emerald-100 text-emerald-700" :
                          company.blueprint_fit === "gut" ? "bg-blue-100 text-blue-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>
                          {company.blueprint_fit}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Grid/List View: Cards (8 cols) + Map Sidebar (4 cols) */
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-8">
                <div className="grid grid-cols-2 gap-6">
                  {filtered.map((company) => (
                    <CompanyCard
                      key={company.id}
                      company={company}
                      isHovered={hoveredCard === company.id}
                      onHover={() => setHoveredCard(company.id)}
                      onLeave={() => setHoveredCard(null)}
                      onClick={() => router.push(`/companies/${company.id}`)}
                    />
                  ))}
                  {filtered.length === 0 && (
                    <div className="col-span-2 bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-12 text-center">
                      <Building2 size={40} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-sm font-medium text-slate-500">Keine Firmen gefunden</p>
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
                        onEntityClick={(id) => router.push(`/companies/${id}`)}
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

      {/* New Company Sheet */}
      {showNewCompany && (
        <CompanySheet
          defaultOpen
          onOpenChange={(open) => { if (!open) setShowNewCompany(false); }}
        />
      )}
    </div>
  );
}

function CompanyCard({
  company,
  isHovered,
  onHover,
  onLeave,
  onClick,
}: {
  company: CompanyEnriched;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      className={`bg-white rounded-2xl border-2 shadow-lg overflow-hidden transition-all group cursor-pointer ${
        isHovered ? "border-[#4454b8] shadow-xl" : "border-slate-200"
      }`}
    >
      {/* Header */}
      <div className="p-5 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white">
        <h3 className="text-base font-bold text-slate-900 mb-1 group-hover:text-[#120774] transition-colors">
          {company.name}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {company.industry && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-medium">
              <Building2 size={12} />
              {company.industry}
            </span>
          )}
          {company.employee_count && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-xs font-bold text-slate-600">
              👥 {company.employee_count}
            </span>
          )}
        </div>
        {company.address_zip && (
          <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-500">
            <MapPin size={11} />
            {company.address_zip} {company.address_city}
          </div>
        )}
        <div className="flex items-center gap-2 mt-2">
          {company.blueprint_fit && (
            <FitBadge fit={company.blueprint_fit} />
          )}
          {company.region && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-500 border border-slate-200">
              ⊕ {company.region}
            </span>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-0">
        <div className="p-3 text-center bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-r border-slate-100">
          <div className="text-lg font-bold text-emerald-700">
            {company.revenue_range ? `€${company.revenue_range}` : "–"}
          </div>
          <div className="text-[10px] font-bold text-emerald-600 uppercase">Potenzial</div>
        </div>
        <div className="p-3 text-center bg-gradient-to-r from-blue-50 to-blue-100/50">
          <div className="text-lg font-bold text-blue-700">
            {company.pipelineValue > 0
              ? new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(company.pipelineValue)
              : "0 €"}
          </div>
          <div className="text-[10px] font-bold text-blue-600 uppercase">Pipeline</div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 space-y-1.5">
        {company.contactName && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="text-slate-400">👤</span>
            {company.contactName}
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="text-slate-400">📅</span>
          Letzter Kontakt: {company.lastActivity || "–"}
        </div>
      </div>
    </div>
  );
}

function FitBadge({ fit }: { fit: string }) {
  const styles: Record<string, string> = {
    ideal: "bg-emerald-100 text-emerald-700 border-emerald-200",
    gut: "bg-blue-100 text-blue-700 border-blue-200",
    möglich: "bg-amber-100 text-amber-700 border-amber-200",
    ungeeignet: "bg-red-100 text-red-700 border-red-200",
  };

  const icons: Record<string, string> = {
    ideal: "⭐",
    gut: "🔥",
    möglich: "❓",
    ungeeignet: "⛔",
  };

  const style = styles[fit] || styles.möglich;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${style}`}>
      {icons[fit]} {fit.charAt(0).toUpperCase() + fit.slice(1)}
    </span>
  );
}
