"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { Building2, Smile, Euro, TrendingUp, MapPin } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard, KPIGrid } from "@/components/ui/kpi-card";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ViewToggle } from "@/components/ui/view-toggle";
import { CompanySheet } from "./company-sheet";
import type { CompanyEnriched, CompanyStats } from "./actions";

const fmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [potentialFilter, setPotentialFilter] = useState("");
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showNewCompany, setShowNewCompany] = useState(false);

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
            actionLabel="Neue Firma"
            actionIcon={Building2}
            onAction={() => setShowNewCompany(true)}
          >
            <FilterSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
            <FilterSelect value={regionFilter} onChange={setRegionFilter} options={regionOptions} />
            <FilterSelect value={potentialFilter} onChange={setPotentialFilter} options={potentialOptions} />
          </FilterBar>

          {/* 2-Column Layout: Cards + Map */}
          <div className="grid grid-cols-12 gap-6">
            {/* Company Cards (8 cols) */}
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

            {/* Map Sidebar (4 cols, sticky) */}
            <div className="col-span-4">
              <div className="sticky top-32 space-y-4">
                {/* PLZ Filter */}
                <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={16} className="text-[#4454b8]" strokeWidth={2.5} />
                    <h3 className="text-sm font-bold text-slate-900">Standort-Filter</h3>
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="PLZ (z.B. 10115)"
                      className="w-full pl-9 pr-4 py-2 rounded-lg border-2 border-slate-200 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#4454b8] focus:ring-2 focus:ring-[#4454b8]/20 transition-all"
                    />
                  </div>
                </div>

                {/* Map Placeholder */}
                <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <MapPin size={16} strokeWidth={2.5} className="text-[#4454b8]" />
                      Deutschland
                    </h3>
                  </div>
                  <div className="relative rounded-xl border-2 border-slate-200 overflow-hidden bg-gradient-to-br from-blue-50/50 to-slate-50 aspect-[3/4] flex items-center justify-center">
                    <div className="text-center">
                      <MapPin size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-xs text-slate-400 font-medium">Karte wird geladen...</p>
                      <p className="text-[10px] text-slate-300 mt-1">{filtered.length} Standorte</p>
                    </div>
                    {/* Pins */}
                    {filtered.slice(0, 10).map((c, i) => (
                      <div
                        key={c.id}
                        className={`absolute w-3 h-3 rounded-full border-2 border-white shadow-md transition-all ${
                          hoveredCard === c.id ? "scale-150 z-10" : ""
                        }`}
                        style={{
                          backgroundColor: c.blueprint_fit === "ideal" ? "#10b981" : c.blueprint_fit === "gut" ? "#4454b8" : "#f97316",
                          top: `${20 + (i * 6)}%`,
                          left: `${30 + ((i * 17) % 40)}%`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
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
              ? new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 0 }).format(company.pipelineValue)
              : "€0k"}
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
