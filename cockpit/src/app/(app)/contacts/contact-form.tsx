"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
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
        />
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
      <p className="text-sm font-medium text-muted-foreground">Beziehung & Rolle</p>

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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="source">Quelle</Label>
          <Input
            id="source"
            name="source"
            placeholder="z.B. Empfehlung, LinkedIn, Event"
            defaultValue={contact?.source ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="region">Region</Label>
          <Input
            id="region"
            name="region"
            placeholder="z.B. DACH, Bayern"
            defaultValue={contact?.region ?? ""}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="language">Sprache</Label>
          <select
            id="language"
            name="language"
            defaultValue={contact?.language ?? "de"}
            className={selectClass}
          >
            <option value="de">Deutsch</option>
            <option value="en">Englisch</option>
            <option value="fr">Französisch</option>
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
      <p className="text-sm font-medium text-muted-foreground">Multiplikator</p>

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
