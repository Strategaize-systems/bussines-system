"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CalendarEvent } from "@/app/(app)/termine/actions";

const selectClass = "select-premium";

interface EventFormProps {
  event?: CalendarEvent;
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  deals: { id: string; title: string }[];
  onSubmit: (formData: FormData) => void;
  isPending?: boolean;
}

function toDateTimeLocal(isoString: string | undefined | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventForm({
  event,
  contacts,
  companies,
  deals,
  onSubmit,
  isPending,
}: EventFormProps) {
  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Titel *</Label>
        <Input
          id="title"
          name="title"
          defaultValue={event?.title}
          placeholder="z.B. Kundenbesuch, Focus-Block"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_time">Beginn *</Label>
          <Input
            id="start_time"
            name="start_time"
            type="datetime-local"
            defaultValue={toDateTimeLocal(event?.start_time)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_time">Ende *</Label>
          <Input
            id="end_time"
            name="end_time"
            type="datetime-local"
            defaultValue={toDateTimeLocal(event?.end_time)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Typ</Label>
          <select
            id="type"
            name="type"
            defaultValue={event?.type ?? "other"}
            className={selectClass}
          >
            <option value="meeting">Meeting</option>
            <option value="call">Anruf</option>
            <option value="block">Blockzeit</option>
            <option value="personal">Persönlich</option>
            <option value="other">Sonstiges</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Ort</Label>
          <Input
            id="location"
            name="location"
            defaultValue={event?.location ?? ""}
            placeholder="z.B. Zoom, Büro"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact_id">Kontakt</Label>
          <select
            id="contact_id"
            name="contact_id"
            defaultValue={event?.contact_id ?? ""}
            className={selectClass}
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
            defaultValue={event?.company_id ?? ""}
            className={selectClass}
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

      <div className="space-y-2">
        <Label htmlFor="deal_id">Deal</Label>
        <select
          id="deal_id"
          name="deal_id"
          defaultValue={event?.deal_id ?? ""}
          className={selectClass}
        >
          <option value="">— Kein Deal —</option>
          {deals.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={event?.description ?? ""}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending
          ? "Speichern..."
          : event
          ? "Aktualisieren"
          : "Event erstellen"}
      </Button>
    </form>
  );
}
