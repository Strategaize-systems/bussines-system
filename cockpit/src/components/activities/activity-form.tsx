"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { createActivity } from "@/lib/actions/activity-actions";

const ACTIVITY_TYPES = [
  { value: "note", label: "Notiz" },
  { value: "call", label: "Anruf" },
  { value: "email", label: "E-Mail" },
  { value: "meeting", label: "Meeting" },
  { value: "task", label: "Aufgabe" },
];

interface ActivityFormProps {
  contactId?: string;
  companyId?: string;
  dealId?: string;
}

export function ActivityForm({ contactId, companyId, dealId }: ActivityFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await createActivity(formData);
      if (!result.error) setShowForm(false);
    });
  };

  if (!showForm) {
    return (
      <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Aktivität hinzufügen
      </Button>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-3 rounded-lg border p-3">
      {contactId && <input type="hidden" name="contact_id" value={contactId} />}
      {companyId && <input type="hidden" name="company_id" value={companyId} />}
      {dealId && <input type="hidden" name="deal_id" value={dealId} />}

      <div className="grid grid-cols-2 gap-3">
        <select
          name="type"
          required
          defaultValue="note"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {ACTIVITY_TYPES.filter((t) => t.value !== "stage_change").map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <Input name="title" placeholder="Titel" className="h-9" />
      </div>

      <Textarea
        name="description"
        placeholder="Beschreibung (optional)"
        rows={2}
      />

      <div className="flex items-center gap-2">
        <Input name="due_date" type="date" className="h-9 w-40" />
        <div className="flex-1" />
        <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
          Abbrechen
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Speichern..." : "Speichern"}
        </Button>
      </div>
    </form>
  );
}
