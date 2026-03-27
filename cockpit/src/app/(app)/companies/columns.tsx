"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { Company } from "./actions";

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
    accessorKey: "email",
    header: "E-Mail",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.email ?? "—"}</span>
    ),
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
