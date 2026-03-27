"use client";

import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { ContactSheet } from "./contact-sheet";
import { columns } from "./columns";
import type { Contact } from "./actions";

interface ContactsClientProps {
  contacts: Contact[];
  companies: { id: string; name: string }[];
}

export function ContactsClient({ contacts, companies }: ContactsClientProps) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Kontakte</h1>
        <ContactSheet companies={companies} />
      </div>
      <DataTable
        columns={columns}
        data={contacts}
        searchPlaceholder="Kontakte suchen..."
        onRowClick={(contact) => router.push(`/contacts/${contact.id}`)}
      />
    </div>
  );
}
