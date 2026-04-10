"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/ui/time-picker";
import type { Meeting } from "@/app/(app)/meetings/actions";

const selectClass = "select-premium";

interface MeetingFormProps {
  meeting?: Meeting;
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  deals: { id: string; title: string }[];
  onSubmit: (formData: FormData) => void;
  isPending?: boolean;
  defaultDealId?: string;
  defaultContactId?: string;
  defaultCompanyId?: string;
}

function parseDatePart(isoString: string | undefined | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseTimePart(isoString: string | undefined | null): string {
  if (!isoString) return "09:00";
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function inferMeetingType(location: string | null | undefined): "online" | "physisch" {
  if (!location) return "online";
  const lower = location.toLowerCase();
  if (
    lower === "home office" ||
    lower.includes("zoom") ||
    lower.includes("teams") ||
    lower.includes("google meet") ||
    lower.includes("online")
  ) {
    return "online";
  }
  if (lower.length > 0) return "physisch";
  return "online";
}

export function MeetingForm({
  meeting,
  contacts,
  companies,
  deals,
  onSubmit,
  isPending,
  defaultDealId,
  defaultContactId,
  defaultCompanyId,
}: MeetingFormProps) {
  const [date, setDate] = useState(parseDatePart(meeting?.scheduled_at));
  const [time, setTime] = useState(parseTimePart(meeting?.scheduled_at));
  const [meetingType, setMeetingType] = useState<"online" | "physisch">(
    meeting ? inferMeetingType(meeting.location) : "online"
  );
  const [location, setLocation] = useState(
    meeting?.location ?? (meetingType === "online" ? "Home Office" : "")
  );

  const handleTypeChange = (newType: "online" | "physisch") => {
    setMeetingType(newType);
    if (newType === "online") {
      setLocation("Home Office");
    } else {
      setLocation(location === "Home Office" ? "" : location);
    }
  };

  const handleSubmit = (formData: FormData) => {
    // Combine date + time into datetime-local format for server action
    if (date && time) {
      formData.set("scheduled_at", `${date}T${time}`);
    }
    formData.set("location", location);
    onSubmit(formData);
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Titel *</Label>
        <Input
          id="title"
          name="title"
          defaultValue={meeting?.title}
          placeholder="z.B. Erstgespräch mit Geschäftsführung"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Datum *</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Uhrzeit *</Label>
          <TimePicker value={time} onChange={setTime} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="duration_minutes">Dauer (Min.)</Label>
          <Input
            id="duration_minutes"
            name="duration_minutes"
            type="number"
            min={15}
            step={15}
            defaultValue={meeting?.duration_minutes ?? 60}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="meeting_type">Typ</Label>
          <select
            id="meeting_type"
            value={meetingType}
            onChange={(e) => handleTypeChange(e.target.value as "online" | "physisch")}
            className={selectClass}
          >
            <option value="online">Online</option>
            <option value="physisch">Physisch</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">
          Ort{meetingType === "physisch" ? " *" : ""}
        </Label>
        {meetingType === "online" ? (
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="z.B. Zoom, Teams"
          />
        ) : (
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="z.B. Büro Frankfurt, Musterstraße 1"
            required
          />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          defaultValue={meeting?.status ?? "planned"}
          className={selectClass}
        >
          <option value="planned">Geplant</option>
          <option value="completed">Durchgeführt</option>
          <option value="cancelled">Abgesagt</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="participants">Teilnehmer</Label>
        <Input
          id="participants"
          name="participants"
          defaultValue={meeting?.participants ?? ""}
          placeholder="z.B. Max Mustermann, Lisa Müller"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact_id">Kontakt</Label>
          <select
            id="contact_id"
            name="contact_id"
            defaultValue={meeting?.contact_id ?? defaultContactId ?? ""}
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
            defaultValue={meeting?.company_id ?? defaultCompanyId ?? ""}
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
          defaultValue={meeting?.deal_id ?? defaultDealId ?? ""}
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
        <Label htmlFor="agenda">Agenda</Label>
        <Textarea
          id="agenda"
          name="agenda"
          rows={3}
          defaultValue={meeting?.agenda ?? ""}
          placeholder="Besprechungsthemen..."
        />
      </div>

      {meeting && (
        <>
          <div className="space-y-2">
            <Label htmlFor="outcome">Ergebnis</Label>
            <Textarea
              id="outcome"
              name="outcome"
              rows={2}
              defaultValue={meeting?.outcome ?? ""}
              placeholder="Ergebnis des Meetings..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notizen</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={meeting?.notes ?? ""}
            />
          </div>
        </>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending
          ? "Speichern..."
          : meeting
          ? "Aktualisieren"
          : "Meeting erstellen"}
      </Button>
    </form>
  );
}
