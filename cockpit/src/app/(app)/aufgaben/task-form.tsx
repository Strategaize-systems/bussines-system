"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Task } from "./actions";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

interface TaskFormProps {
  task?: Task;
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  deals: { id: string; title: string }[];
  onSubmit: (formData: FormData) => void;
  isPending?: boolean;
}

export function TaskForm({
  task,
  contacts,
  companies,
  deals,
  onSubmit,
  isPending,
}: TaskFormProps) {
  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Aufgabe *</Label>
        <Input
          id="title"
          name="title"
          defaultValue={task?.title}
          placeholder="z.B. Angebot nachfassen"
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="due_date">Fällig am</Label>
          <Input
            id="due_date"
            name="due_date"
            type="date"
            defaultValue={task?.due_date ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">Priorität</Label>
          <select
            id="priority"
            name="priority"
            defaultValue={task?.priority ?? "medium"}
            className={selectClass}
          >
            <option value="high">Hoch</option>
            <option value="medium">Mittel</option>
            <option value="low">Niedrig</option>
          </select>
        </div>
        {task && (
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={task.status}
              className={selectClass}
            >
              <option value="open">Offen</option>
              <option value="waiting">Wartet</option>
              <option value="completed">Erledigt</option>
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact_id">Kontakt</Label>
          <select
            id="contact_id"
            name="contact_id"
            defaultValue={task?.contact_id ?? ""}
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
            defaultValue={task?.company_id ?? ""}
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
          defaultValue={task?.deal_id ?? ""}
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
          defaultValue={task?.description ?? ""}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Speichern..." : task ? "Aktualisieren" : "Erstellen"}
      </Button>
    </form>
  );
}
