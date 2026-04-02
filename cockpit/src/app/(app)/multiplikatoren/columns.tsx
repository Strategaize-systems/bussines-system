"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { Contact } from "../contacts/actions";

const multiplierTypeLabels: Record<string, string> = {
  berater: "Berater",
  banker: "Banker",
  anwalt: "Anwalt",
  steuerberater: "Steuerberater",
  makler: "Makler",
  branchenexperte: "Branchenexperte",
};

const trustColors: Record<string, string> = {
  hoch: "bg-green-100 text-green-800",
  mittel: "bg-yellow-100 text-yellow-800",
  niedrig: "bg-red-100 text-red-800",
  unbekannt: "bg-gray-100 text-gray-800",
};

const capabilityColors: Record<string, string> = {
  hoch: "bg-green-100 text-green-800",
  mittel: "bg-yellow-100 text-yellow-800",
  niedrig: "bg-red-100 text-red-800",
};

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
    accessorKey: "multiplier_type",
    header: "Typ",
    cell: ({ row }) => {
      const mt = row.original.multiplier_type;
      return mt ? (
        <Badge variant="secondary" className="text-xs">
          {multiplierTypeLabels[mt] ?? mt}
        </Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    id: "company",
    header: "Firma",
    cell: ({ row }) => (
      <span>{row.original.companies?.name ?? "—"}</span>
    ),
  },
  {
    accessorKey: "trust_level",
    header: "Vertrauen",
    cell: ({ row }) => {
      const tl = row.original.trust_level;
      if (!tl) return <span className="text-muted-foreground">—</span>;
      const colors = trustColors[tl] ?? "bg-gray-100 text-gray-800";
      return (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors}`}>
          {tl.charAt(0).toUpperCase() + tl.slice(1)}
        </span>
      );
    },
  },
  {
    accessorKey: "referral_capability",
    header: "Empfehlung",
    cell: ({ row }) => {
      const rc = row.original.referral_capability;
      if (!rc) return <span className="text-muted-foreground">—</span>;
      const colors = capabilityColors[rc] ?? "bg-gray-100 text-gray-800";
      return (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors}`}>
          {rc.charAt(0).toUpperCase() + rc.slice(1)}
        </span>
      );
    },
  },
  {
    accessorKey: "region",
    header: "Region",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.region ?? "—"}
      </span>
    ),
  },
];
