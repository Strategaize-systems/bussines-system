"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { useState } from "react";
import type { Company } from "./actions";

interface CompanyFormProps {
  company?: Company;
  onSubmit: (formData: FormData) => void;
  isPending?: boolean;
}

export function CompanyForm({ company, onSubmit, isPending }: CompanyFormProps) {
  const [tags, setTags] = useState<string[]>(company?.tags ?? []);

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Firmenname *</Label>
        <Input
          id="name"
          name="name"
          defaultValue={company?.name}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="industry">Branche</Label>
          <Input
            id="industry"
            name="industry"
            defaultValue={company?.industry ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            name="website"
            defaultValue={company?.website ?? ""}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-Mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={company?.email ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            name="phone"
            defaultValue={company?.phone ?? ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address_street">Straße</Label>
        <Input
          id="address_street"
          name="address_street"
          defaultValue={company?.address_street ?? ""}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="address_zip">PLZ</Label>
          <Input
            id="address_zip"
            name="address_zip"
            defaultValue={company?.address_zip ?? ""}
          />
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="address_city">Ort</Label>
          <Input
            id="address_city"
            name="address_city"
            defaultValue={company?.address_city ?? ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address_country">Land</Label>
        <Input
          id="address_country"
          name="address_country"
          defaultValue={company?.address_country ?? "Deutschland"}
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
          defaultValue={company?.notes ?? ""}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending
          ? "Speichern..."
          : company
          ? "Aktualisieren"
          : "Erstellen"}
      </Button>
    </form>
  );
}
