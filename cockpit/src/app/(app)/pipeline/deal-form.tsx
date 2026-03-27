"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/ui/tag-input";
import { useState } from "react";
import type { Deal, PipelineStage } from "./actions";

interface DealFormProps {
  deal?: Deal;
  stages: PipelineStage[];
  pipelineId: string;
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  onSubmit: (formData: FormData) => void;
  isPending?: boolean;
}

export function DealForm({
  deal,
  stages,
  pipelineId,
  contacts,
  companies,
  onSubmit,
  isPending,
}: DealFormProps) {
  const [tags, setTags] = useState<string[]>(deal?.tags ?? []);

  return (
    <form action={onSubmit} className="space-y-4">
      <input type="hidden" name="pipeline_id" value={pipelineId} />

      <div className="space-y-2">
        <Label htmlFor="title">Titel *</Label>
        <Input
          id="title"
          name="title"
          defaultValue={deal?.title}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="value">Wert (EUR)</Label>
          <Input
            id="value"
            name="value"
            type="number"
            step="0.01"
            defaultValue={deal?.value ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stage_id">Stage *</Label>
          <select
            id="stage_id"
            name="stage_id"
            defaultValue={deal?.stage_id ?? stages[0]?.id ?? ""}
            required
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact_id">Kontakt</Label>
          <select
            id="contact_id"
            name="contact_id"
            defaultValue={deal?.contact_id ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">— Kein Kontakt —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="company_id">Firma</Label>
          <select
            id="company_id"
            name="company_id"
            defaultValue={deal?.company_id ?? ""}
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expected_close_date">Voraussichtlicher Abschluss</Label>
          <Input
            id="expected_close_date"
            name="expected_close_date"
            type="date"
            defaultValue={deal?.expected_close_date ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="next_action_date">Nächste Aktion am</Label>
          <Input
            id="next_action_date"
            name="next_action_date"
            type="date"
            defaultValue={deal?.next_action_date ?? ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="next_action">Nächste Aktion</Label>
        <Input
          id="next_action"
          name="next_action"
          defaultValue={deal?.next_action ?? ""}
          placeholder="z.B. Angebot nachfassen"
        />
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <TagInput value={tags} onChange={setTags} />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Speichern..." : deal ? "Aktualisieren" : "Erstellen"}
      </Button>
    </form>
  );
}
