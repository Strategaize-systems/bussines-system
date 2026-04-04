"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import type { Deal, PipelineStage } from "./actions";

const selectClass = "select-premium";

const LOST_STAGE_NAMES = ["Verloren", "Inaktiv / disqualifiziert"];

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
  const [selectedStageId, setSelectedStageId] = useState(
    deal?.stage_id ?? stages[0]?.id ?? ""
  );

  const selectedStage = stages.find((s) => s.id === selectedStageId);
  const isLostStage = selectedStage
    ? LOST_STAGE_NAMES.includes(selectedStage.name)
    : false;

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

      {deal && (
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={deal.status}
            className={selectClass}
          >
            <option value="active">Aktiv</option>
            <option value="won">Gewonnen</option>
            <option value="lost">Verloren</option>
          </select>
        </div>
      )}

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
            value={selectedStageId}
            onChange={(e) => setSelectedStageId(e.target.value)}
            required
            className={selectClass}
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="opportunity_type">Opportunity-Typ</Label>
        <select
          id="opportunity_type"
          name="opportunity_type"
          defaultValue={deal?.opportunity_type ?? ""}
          className={selectClass}
        >
          <option value="">— Auswählen —</option>
          <option value="empfehlung">Empfehlung</option>
          <option value="direktansprache">Direktansprache</option>
          <option value="inbound">Inbound</option>
          <option value="netzwerk">Netzwerk</option>
          <option value="event">Event</option>
          <option value="bestandskunde">Bestandskunde</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact_id">Kontakt</Label>
          <select
            id="contact_id"
            name="contact_id"
            defaultValue={deal?.contact_id ?? ""}
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
            defaultValue={deal?.company_id ?? ""}
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

      {isLostStage && (
        <>
          <Separator />
          <p className="text-xs font-bold uppercase tracking-wider text-red-600">Verloren / Inaktiv</p>

          <div className="space-y-2">
            <Label htmlFor="won_lost_reason">Verlustgrund</Label>
            <select
              id="won_lost_reason"
              name="won_lost_reason"
              defaultValue={deal?.won_lost_reason ?? ""}
              className={selectClass}
            >
              <option value="">— Auswählen —</option>
              <option value="kein_budget">Kein Budget</option>
              <option value="kein_bedarf">Kein Bedarf erkannt</option>
              <option value="timing">Falscher Zeitpunkt</option>
              <option value="wettbewerb">Wettbewerber gewählt</option>
              <option value="entscheider">Kein Zugang zum Entscheider</option>
              <option value="fit">Kein Fit (Komplexität/Branche)</option>
              <option value="ghosting">Ghosting / keine Rückmeldung</option>
              <option value="intern">Interne Gründe beim Kunden</option>
              <option value="sonstiges">Sonstiges</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="won_lost_details">Details zum Verlust</Label>
            <Textarea
              id="won_lost_details"
              name="won_lost_details"
              rows={2}
              defaultValue={deal?.won_lost_details ?? ""}
              placeholder="Was war der konkrete Grund?"
            />
          </div>
        </>
      )}

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
