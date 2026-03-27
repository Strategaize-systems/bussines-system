"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { useState } from "react";
import type { Contact } from "./actions";

interface ContactFormProps {
  contact?: Contact;
  companies: { id: string; name: string }[];
  onSubmit: (formData: FormData) => void;
  isPending?: boolean;
}

export function ContactForm({
  contact,
  companies,
  onSubmit,
  isPending,
}: ContactFormProps) {
  const [tags, setTags] = useState<string[]>(contact?.tags ?? []);

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">Vorname *</Label>
          <Input
            id="first_name"
            name="first_name"
            defaultValue={contact?.first_name}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Nachname *</Label>
          <Input
            id="last_name"
            name="last_name"
            defaultValue={contact?.last_name}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-Mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={contact?.email ?? ""}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            name="phone"
            defaultValue={contact?.phone ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="position">Position</Label>
          <Input
            id="position"
            name="position"
            defaultValue={contact?.position ?? ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="company_id">Firma</Label>
        <select
          id="company_id"
          name="company_id"
          defaultValue={contact?.company_id ?? ""}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">— Keine Firma —</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="linkedin_url">LinkedIn URL</Label>
        <Input
          id="linkedin_url"
          name="linkedin_url"
          defaultValue={contact?.linkedin_url ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <TagInput value={tags} onChange={setTags} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notizen</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={contact?.notes ?? ""}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Speichern..." : contact ? "Aktualisieren" : "Erstellen"}
      </Button>
    </form>
  );
}
