"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { useState } from "react";
import type { CalendarEntry } from "./actions";

const CONTENT_TYPES = [
  { value: "blog", label: "Blog-Post" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "newsletter", label: "Newsletter" },
  { value: "case_study", label: "Case Study" },
  { value: "video", label: "Video" },
  { value: "other", label: "Sonstiges" },
];

const CHANNELS = [
  { value: "website", label: "Website" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "email", label: "E-Mail" },
  { value: "youtube", label: "YouTube" },
  { value: "other", label: "Sonstiges" },
];

interface EntryFormProps {
  entry?: CalendarEntry;
  onSubmit: (formData: FormData) => void;
  isPending?: boolean;
}

export function EntryForm({ entry, onSubmit, isPending }: EntryFormProps) {
  const [tags, setTags] = useState<string[]>(entry?.tags ?? []);

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Titel *</Label>
        <Input id="title" name="title" defaultValue={entry?.title} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="content_type">Typ *</Label>
          <select
            id="content_type"
            name="content_type"
            defaultValue={entry?.content_type ?? "blog"}
            required
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {CONTENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="channel">Kanal</Label>
          <select
            id="channel"
            name="channel"
            defaultValue={entry?.channel ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">— Kein Kanal —</option>
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="planned_date">Geplantes Datum</Label>
        <Input
          id="planned_date"
          name="planned_date"
          type="date"
          defaultValue={entry?.planned_date ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={entry?.description ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <TagInput value={tags} onChange={setTags} />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Speichern..." : entry ? "Aktualisieren" : "Erstellen"}
      </Button>
    </form>
  );
}
