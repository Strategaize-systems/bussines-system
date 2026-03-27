"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { Contact } from "./actions";

export const columns: ColumnDef<Contact>[] = [
  {
    accessorFn: (row) => `${row.first_name} ${row.last_name}`,
    id: "name",
    header: "Name",
    cell: ({ row }) => (
      <span className="font-medium">
        {row.original.first_name} {row.original.last_name}
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
    id: "company",
    header: "Firma",
    cell: ({ row }) => (
      <span>{row.original.companies?.name ?? "—"}</span>
    ),
  },
  {
    accessorKey: "position",
    header: "Position",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.position ?? "—"}
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
