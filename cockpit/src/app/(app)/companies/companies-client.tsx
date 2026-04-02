"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import { CompanySheet } from "./company-sheet";
import { columns } from "./columns";
import type { Company } from "./actions";

const selectClass = "select-premium";

const blueprintFitOptions = [
  { value: "", label: "Alle Blueprint-Fits" },
  { value: "ideal", label: "Ideal" },
  { value: "gut", label: "Gut" },
  { value: "möglich", label: "Möglich" },
  { value: "ungeeignet", label: "Ungeeignet" },
];

interface CompaniesClientProps {
  companies: Company[];
}

export function CompaniesClient({ companies }: CompaniesClientProps) {
  const router = useRouter();
  const [bpFilter, setBpFilter] = useState("");

  const filtered = useMemo(() => {
    if (!bpFilter) return companies;
    return companies.filter((c) => c.blueprint_fit === bpFilter);
  }, [companies, bpFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Firmen</h1>
        <CompanySheet />
      </div>
      <div className="flex items-center gap-3">
        <select
          value={bpFilter}
          onChange={(e) => setBpFilter(e.target.value)}
          className={selectClass}
        >
          {blueprintFitOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {bpFilter && (
          <span className="text-sm text-muted-foreground">
            {filtered.length} von {companies.length}
          </span>
        )}
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        searchPlaceholder="Firmen suchen..."
        searchColumn="name"
        onRowClick={(company) => router.push(`/companies/${company.id}`)}
      />
    </div>
  );
}
