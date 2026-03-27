"use client";

import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { CompanySheet } from "./company-sheet";
import { columns } from "./columns";
import type { Company } from "./actions";

interface CompaniesClientProps {
  companies: Company[];
}

export function CompaniesClient({ companies }: CompaniesClientProps) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Firmen</h1>
        <CompanySheet />
      </div>
      <DataTable
        columns={columns}
        data={companies}
        searchPlaceholder="Firmen suchen..."
        searchColumn="name"
        onRowClick={(company) => router.push(`/companies/${company.id}`)}
      />
    </div>
  );
}
