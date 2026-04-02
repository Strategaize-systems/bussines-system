"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import { ContactSheet } from "./contact-sheet";
import { columns } from "./columns";
import type { Contact } from "./actions";

const selectClass =
  "flex h-8 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const relationshipOptions = [
  { value: "", label: "Alle Typen" },
  { value: "multiplikator", label: "Multiplikator" },
  { value: "kunde", label: "Kunde" },
  { value: "partner", label: "Partner" },
  { value: "interessent", label: "Interessent" },
  { value: "netzwerk", label: "Netzwerk" },
  { value: "empfehler", label: "Empfehler" },
];

interface ContactsClientProps {
  contacts: Contact[];
  companies: { id: string; name: string }[];
}

export function ContactsClient({ contacts, companies }: ContactsClientProps) {
  const router = useRouter();
  const [relationshipFilter, setRelationshipFilter] = useState("");

  const filtered = useMemo(() => {
    if (!relationshipFilter) return contacts;
    return contacts.filter((c) => c.relationship_type === relationshipFilter);
  }, [contacts, relationshipFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Kontakte</h1>
        <ContactSheet companies={companies} />
      </div>
      <div className="flex items-center gap-3">
        <select
          value={relationshipFilter}
          onChange={(e) => setRelationshipFilter(e.target.value)}
          className={selectClass}
        >
          {relationshipOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {relationshipFilter && (
          <span className="text-sm text-muted-foreground">
            {filtered.length} von {contacts.length}
          </span>
        )}
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        searchPlaceholder="Kontakte suchen..."
        onRowClick={(contact) => router.push(`/contacts/${contact.id}`)}
      />
    </div>
  );
}
