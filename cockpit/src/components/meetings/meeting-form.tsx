"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

function toDateTimeLocal(isoString: string | undefined | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  // Format: YYYY-MM-DDTHH:MM
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  return (
    <form action={onSubmit} className="space-y-4">
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
          <Label htmlFor="scheduled_at">Termin *</Label>
          <Input
            id="scheduled_at"
            name="scheduled_at"
            type="datetime-local"
            defaultValue={toDateTimeLocal(meeting?.scheduled_at)}
            required
          />
        </div>
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="location">Ort</Label>
          <Input
            id="location"
            name="location"
            defaultValue={meeting?.location ?? ""}
            placeholder="z.B. Zoom, Büro Frankfurt"
          />
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
