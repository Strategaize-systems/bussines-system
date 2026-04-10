"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/ui/time-picker";
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

function parseDatePart(isoString: string | undefined | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseTimePart(isoString: string | undefined | null, fallback: string): string {
  if (!isoString) return fallback;
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventForm({
  event,
  contacts,
  companies,
  deals,
  onSubmit,
  isPending,
}: EventFormProps) {
  const [startDate, setStartDate] = useState(parseDatePart(event?.start_time));
  const [startTime, setStartTime] = useState(parseTimePart(event?.start_time, "09:00"));
  const [endDate, setEndDate] = useState(parseDatePart(event?.end_time));
  const [endTime, setEndTime] = useState(parseTimePart(event?.end_time, "10:00"));

  const handleSubmit = (formData: FormData) => {
    // Combine date + time into datetime-local format for server action
    if (startDate && startTime) {
      formData.set("start_time", `${startDate}T${startTime}`);
    }
    if (endDate && endTime) {
      formData.set("end_time", `${endDate}T${endTime}`);
    }
    onSubmit(formData);
  };

  // When start date changes, sync end date if empty or earlier
  const handleStartDateChange = (newDate: string) => {
    setStartDate(newDate);
    if (!endDate || endDate < newDate) {
      setEndDate(newDate);
    }
  };

  return (
    <form action={handleSubmit} className="space-y-4">
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
          <Label htmlFor="start_date">Datum Beginn *</Label>
          <Input
            id="start_date"
            type="date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Uhrzeit Beginn *</Label>
          <TimePicker value={startTime} onChange={setStartTime} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="end_date">Datum Ende *</Label>
          <Input
            id="end_date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Uhrzeit Ende *</Label>
          <TimePicker value={endTime} onChange={setEndTime} />
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
