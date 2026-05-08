"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { Separator } from "@/components/ui/separator";
import { DuplicateWarning, useDuplicateCheck } from "@/components/ui/duplicate-warning";
import { checkContactDuplicate } from "@/lib/duplicate-check";
import { useState, useCallback } from "react";
import { CampaignPicker } from "@/components/campaigns/campaign-picker";
import type { Contact } from "./actions";

const selectClass = "select-premium";

interface ContactFormProps {
  contact?: Contact;
  companies: { id: string; name: string }[];
  onSubmit: (formData: FormData) => void;
  isPending?: boolean;
}

export function ContactForm({
  contact,
  companies,
  onSubmit,
  isPending,
}: ContactFormProps) {
  const [tags, setTags] = useState<string[]>(contact?.tags ?? []);
  const [campaignId, setCampaignId] = useState<string | null>(
    contact?.campaign_id ?? null
  );
  const dupCheck = useDuplicateCheck(useCallback((v: string) => checkContactDuplicate(v), []));

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">Vorname *</Label>
          <Input
            id="first_name"
            name="first_name"
            defaultValue={contact?.first_name}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Nachname *</Label>
          <Input
            id="last_name"
            name="last_name"
            defaultValue={contact?.last_name}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-Mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={contact?.email ?? ""}
          onBlur={(e) => {
            if (!contact && e.target.value) dupCheck.check(e.target.value);
          }}
        />
        <DuplicateWarning result={dupCheck.result} entityType="contact" onDismiss={dupCheck.dismiss} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            name="phone"
            defaultValue={contact?.phone ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="position">Position</Label>
          <Input
            id="position"
            name="position"
            defaultValue={contact?.position ?? ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="company_id">Firma</Label>
        <select
          id="company_id"
          name="company_id"
          defaultValue={contact?.company_id ?? ""}
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="linkedin_url">LinkedIn URL</Label>
          <Input
            id="linkedin_url"
            name="linkedin_url"
            defaultValue={contact?.linkedin_url ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="meeting_link">Meeting-Link</Label>
          <Input
            id="meeting_link"
            name="meeting_link"
            placeholder="z.B. calendly.com/..."
            defaultValue={contact?.meeting_link ?? ""}
          />
        </div>
      </div>

      <Separator />
      <p className="text-xs font-bold uppercase tracking-wider text-[#4454b8]">Beziehung & Rolle</p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="relationship_type">Beziehungstyp</Label>
          <select
            id="relationship_type"
            name="relationship_type"
            defaultValue={contact?.relationship_type ?? ""}
            className={selectClass}
          >
            <option value="">— Auswählen —</option>
            <option value="multiplikator">Multiplikator</option>
            <option value="kunde">Kunde</option>
            <option value="partner">Partner</option>
            <option value="interessent">Interessent</option>
            <option value="netzwerk">Netzwerk</option>
            <option value="empfehler">Empfehler</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="role_in_process">Rolle im Prozess</Label>
          <select
            id="role_in_process"
            name="role_in_process"
            defaultValue={contact?.role_in_process ?? ""}
            className={selectClass}
          >
            <option value="">— Auswählen —</option>
            <option value="entscheider">Entscheider</option>
            <option value="beeinflusser">Beeinflusser</option>
            <option value="umsetzer">Umsetzer</option>
            <option value="champion">Champion</option>
            <option value="gatekeeper">Gatekeeper</option>
          </select>
        </div>
      </div>

      {/*
        V6.5 SLC-657 MT-4 (DEC-159 / DEC-160) — Legacy-Source-Felder.
        Neue Eingaben laufen nur noch ueber CampaignPicker. Bestehende source/
        source_detail-Werte bleiben in der DB als Backup erhalten und werden
        hier read-only angezeigt. Hidden Inputs preserven die Werte beim
        Update damit der Server-Action sie nicht versehentlich auf NULL setzt.
      */}
      {(contact?.source || contact?.source_detail) && (
        <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Legacy-Quelle (read-only)
          </p>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-xs text-slate-700">
            {contact.source && (
              <>
                <dt className="font-medium text-slate-500">Quelle</dt>
                <dd>{contact.source}</dd>
              </>
            )}
            {contact.source_detail && (
              <>
                <dt className="font-medium text-slate-500">Quell-Detail</dt>
                <dd>{contact.source_detail}</dd>
              </>
            )}
          </dl>
          <p className="text-[11px] text-slate-500">
            Legacy-Quelle, neue Eingaben via Kampagne.
          </p>
        </div>
      )}
      <input type="hidden" name="source" value={contact?.source ?? ""} />
      <input
        type="hidden"
        name="source_detail"
        value={contact?.source_detail ?? ""}
      />

      <CampaignPicker
        value={campaignId}
        onChange={setCampaignId}
        helperText="Verknuepft den Kontakt mit einer Marketing-Kampagne fuer Attribution."
      />
      <input type="hidden" name="campaign_id" value={campaignId ?? ""} />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="region">Region</Label>
          <Input
            id="region"
            name="region"
            placeholder="z.B. DACH, Bayern"
            defaultValue={contact?.region ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="language">Sprache</Label>
          <select
            id="language"
            name="language"
            defaultValue={contact?.language ?? "de"}
            className={selectClass}
          >
            <option value="de">Deutsch</option>
            <option value="nl">Niederländisch</option>
            <option value="en">Englisch</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="trust_level">Vertrauenslevel</Label>
          <select
            id="trust_level"
            name="trust_level"
            defaultValue={contact?.trust_level ?? ""}
            className={selectClass}
          >
            <option value="">— Auswählen —</option>
            <option value="hoch">Hoch</option>
            <option value="mittel">Mittel</option>
            <option value="niedrig">Niedrig</option>
            <option value="unbekannt">Unbekannt</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="referral_capability">Empfehlungsfähigkeit</Label>
        <select
          id="referral_capability"
          name="referral_capability"
          defaultValue={contact?.referral_capability ?? ""}
          className={selectClass}
        >
          <option value="">— Auswählen —</option>
          <option value="hoch">Hoch</option>
          <option value="mittel">Mittel</option>
          <option value="niedrig">Niedrig</option>
        </select>
      </div>

      <Separator />
      <p className="text-xs font-bold uppercase tracking-wider text-[#4454b8]">Multiplikator</p>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="is_multiplier"
          name="is_multiplier"
          defaultChecked={contact?.is_multiplier ?? false}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="is_multiplier" className="mb-0">
          Ist Multiplikator
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="multiplier_type">Multiplikator-Typ</Label>
        <select
          id="multiplier_type"
          name="multiplier_type"
          defaultValue={contact?.multiplier_type ?? ""}
          className={selectClass}
        >
          <option value="">— Auswählen —</option>
          <option value="berater">Berater</option>
          <option value="banker">Banker</option>
          <option value="anwalt">Anwalt</option>
          <option value="steuerberater">Steuerberater</option>
          <option value="makler">Makler</option>
          <option value="branchenexperte">Branchenexperte</option>
        </select>
      </div>

      <Separator />

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
          defaultValue={contact?.notes ?? ""}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Speichern..." : contact ? "Aktualisieren" : "Erstellen"}
      </Button>
    </form>
  );
}
