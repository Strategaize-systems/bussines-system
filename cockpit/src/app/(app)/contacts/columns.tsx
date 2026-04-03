"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import type { Contact } from "./actions";

const relationshipLabels: Record<string, string> = {
  multiplikator: "Multiplikator",
  kunde: "Kunde",
  partner: "Partner",
  interessent: "Interessent",
  netzwerk: "Netzwerk",
  empfehler: "Empfehler",
};

export const columns: ColumnDef<Contact>[] = [
  {
    accessorFn: (row) => `${row.first_name} ${row.last_name}`,
    id: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-medium">
          {row.original.first_name} {row.original.last_name}
        </span>
        {row.original.is_multiplier && (
          <Badge className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0">M</Badge>
        )}
      </div>
    ),
  },
  {
    accessorKey: "relationship_type",
    header: "Typ",
    cell: ({ row }) => {
      const rt = row.original.relationship_type;
      return rt ? (
        <Badge variant="outline" className="text-xs">
          {relationshipLabels[rt] ?? rt}
        </Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
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
  {
    id: "actions",
    header: "",
    enableSorting: false,
    cell: () => (
      <ChevronRight className="h-4 w-4 text-slate-300 opacity-0 group-hover/row:opacity-100 transition-opacity" />
    ),
  },
];
