"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { Company } from "./actions";

const blueprintFitColors: Record<string, string> = {
  ideal: "bg-green-500",
  gut: "bg-green-400",
  "möglich": "bg-yellow-400",
  ungeeignet: "bg-red-500",
};

const blueprintFitLabels: Record<string, string> = {
  ideal: "Ideal",
  gut: "Gut",
  "möglich": "Möglich",
  ungeeignet: "Ungeeignet",
};

export const columns: ColumnDef<Company>[] = [
  {
    accessorKey: "name",
    header: "Firma",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    ),
  },
  {
    accessorKey: "industry",
    header: "Branche",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.industry ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "blueprint_fit",
    header: "Blueprint-Fit",
    cell: ({ row }) => {
      const bf = row.original.blueprint_fit;
      if (!bf) return <span className="text-muted-foreground">—</span>;
      return (
        <div className="flex items-center gap-1.5">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${blueprintFitColors[bf] ?? "bg-gray-400"}`} />
          <span className="text-sm">{blueprintFitLabels[bf] ?? bf}</span>
        </div>
      );
    },
  },
  {
    id: "location",
    header: "Ort",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {[row.original.address_zip, row.original.address_city]
          .filter(Boolean)
          .join(" ") || "—"}
      </span>
    ),
  },
  {
    accessorKey: "tags",
    header: "Tags",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.tags?.map((tag) => (
          <Badge key={tag} variant="outline" className="text-xs">
            {tag}
          </Badge>
        ))}
      </div>
    ),
  },
];
