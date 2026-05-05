"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { Separator } from "@/components/ui/separator";
import { DuplicateWarning, useDuplicateCheck } from "@/components/ui/duplicate-warning";
import { PlzCityAutocomplete } from "@/components/ui/plz-city-autocomplete";
import { checkCompanyDuplicate } from "@/lib/duplicate-check";
import { useMemo, useState, useCallback } from "react";
import { CampaignPicker } from "@/components/campaigns/campaign-picker";
import type { Company } from "./actions";
import { validateEuVatId } from "@/lib/validation/vat-id";

const selectClass = "select-premium";

interface CompanyFormProps {
  company?: Company;
  onSubmit: (formData: FormData) => void;
  isPending?: boolean;
}

export function CompanyForm({ company, onSubmit, isPending }: CompanyFormProps) {
  const [tags, setTags] = useState<string[]>(company?.tags ?? []);
  const [plz, setPlz] = useState(company?.address_zip ?? "");
  const [city, setCity] = useState(company?.address_city ?? "");
  const [vatId, setVatId] = useState(company?.vat_id ?? "");
  const [campaignId, setCampaignId] = useState<string | null>(
    company?.campaign_id ?? null
  );
  const dupCheck = useDuplicateCheck(useCallback((v: string) => checkCompanyDuplicate(v), []));

  const vatIdInlineError = useMemo(() => {
    const trimmed = vatId.trim();
    if (!trimmed) return null;
    const result = validateEuVatId(trimmed);
    return result.valid ? null : result.error;
  }, [vatId]);

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Firmenname *</Label>
        <Input
          id="name"
          name="name"
          defaultValue={company?.name}
          required
          onBlur={(e) => {
            if (!company && e.target.value) dupCheck.check(e.target.value);
          }}
        />
        <DuplicateWarning result={dupCheck.result} entityType="company" onDismiss={dupCheck.dismiss} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="industry">Branche</Label>
          <Input
            id="industry"
            name="industry"
            defaultValue={company?.industry ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            name="website"
            defaultValue={company?.website ?? ""}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-Mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={company?.email ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            name="phone"
            defaultValue={company?.phone ?? ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address_street">Straße</Label>
        <Input
          id="address_street"
          name="address_street"
          defaultValue={company?.address_street ?? ""}
        />
      </div>

      <PlzCityAutocomplete
        plzValue={plz}
        cityValue={city}
        onPlzChange={setPlz}
        onCityChange={setCity}
      />

      <div className="space-y-2">
        <Label htmlFor="address_country">Land</Label>
        <Input
          id="address_country"
          name="address_country"
          defaultValue={company?.address_country ?? "Deutschland"}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="vat_id">USt-IdNr. / BTW-Nummer (optional)</Label>
        <Input
          id="vat_id"
          name="vat_id"
          value={vatId}
          onChange={(e) => setVatId(e.target.value)}
          placeholder="DE123456789, NL123456789B01, ATU12345678 ..."
        />
        {vatIdInlineError ? (
          <p className="text-xs text-destructive">{vatIdInlineError}</p>
        ) : (
          <p className="text-xs text-slate-400">
            EU-VAT-ID des Empfaengers. Voraussetzung fuer Reverse-Charge-Angebote.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="employee_count">Mitarbeiterzahl</Label>
          <select
            id="employee_count"
            name="employee_count"
            defaultValue={company?.employee_count ?? ""}
            className={selectClass}
          >
            <option value="">— Auswählen —</option>
            <option value="1-10">1–10</option>
            <option value="11-50">11–50</option>
            <option value="51-200">51–200</option>
            <option value="201-500">201–500</option>
            <option value="500+">500+</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="revenue_range">Umsatzklasse</Label>
          <select
            id="revenue_range"
            name="revenue_range"
            defaultValue={company?.revenue_range ?? ""}
            className={selectClass}
          >
            <option value="">— Auswählen —</option>
            <option value="<1M">&lt; 1 Mio.</option>
            <option value="1-5M">1–5 Mio.</option>
            <option value="5-20M">5–20 Mio.</option>
            <option value="20-50M">20–50 Mio.</option>
            <option value="50M+">50+ Mio.</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ownership_structure">Eigentümerstruktur</Label>
        <Input
          id="ownership_structure"
          name="ownership_structure"
          placeholder="z.B. Inhaber-geführt, PE-backed, Family Office"
          defaultValue={company?.ownership_structure ?? ""}
        />
      </div>

      <Separator />
      <p className="text-xs font-bold uppercase tracking-wider text-[#4454b8]">Eignungsbewertung</p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="blueprint_fit">Blueprint-Fit</Label>
          <select
            id="blueprint_fit"
            name="blueprint_fit"
            defaultValue={company?.blueprint_fit ?? ""}
            className={selectClass}
          >
            <option value="">— Auswählen —</option>
            <option value="ideal">Ideal</option>
            <option value="gut">Gut</option>
            <option value="möglich">Möglich</option>
            <option value="ungeeignet">Ungeeignet</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="exit_relevance">Exit-Relevanz</Label>
          <select
            id="exit_relevance"
            name="exit_relevance"
            defaultValue={company?.exit_relevance ?? ""}
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ai_readiness">KI-Reife</Label>
          <select
            id="ai_readiness"
            name="ai_readiness"
            defaultValue={company?.ai_readiness ?? ""}
            className={selectClass}
          >
            <option value="">— Auswählen —</option>
            <option value="hoch">Hoch</option>
            <option value="mittel">Mittel</option>
            <option value="niedrig">Niedrig</option>
            <option value="unbekannt">Unbekannt</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="budget_potential">Budget-Potential</Label>
          <select
            id="budget_potential"
            name="budget_potential"
            defaultValue={company?.budget_potential ?? ""}
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
        <Label htmlFor="strategic_relevance">Strategische Relevanz</Label>
        <select
          id="strategic_relevance"
          name="strategic_relevance"
          defaultValue={company?.strategic_relevance ?? ""}
          className={selectClass}
        >
          <option value="">— Auswählen —</option>
          <option value="hoch">Hoch</option>
          <option value="mittel">Mittel</option>
          <option value="niedrig">Niedrig</option>
        </select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="decision_maker_access"
            name="decision_maker_access"
            defaultChecked={company?.decision_maker_access ?? false}
            className="h-4 w-4 rounded border-input"
          />
          <Label htmlFor="decision_maker_access" className="mb-0">
            Zugang zum Entscheider
          </Label>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="complexity_fit"
            name="complexity_fit"
            defaultChecked={company?.complexity_fit ?? false}
            className="h-4 w-4 rounded border-input"
          />
          <Label htmlFor="complexity_fit" className="mb-0">
            Komplexitäts-Fit
          </Label>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="willingness"
            name="willingness"
            defaultChecked={company?.willingness ?? false}
            className="h-4 w-4 rounded border-input"
          />
          <Label htmlFor="willingness" className="mb-0">
            Veränderungsbereitschaft
          </Label>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="champion_potential"
            name="champion_potential"
            defaultChecked={company?.champion_potential ?? false}
            className="h-4 w-4 rounded border-input"
          />
          <Label htmlFor="champion_potential" className="mb-0">
            Champion-Potential
          </Label>
        </div>
      </div>

      <Separator />

      {/* Source / Attribution */}
      <Separator />
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Herkunft</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="source_type">Quelle</Label>
          <select
            id="source_type"
            name="source_type"
            defaultValue={company?.source_type ?? ""}
            className={selectClass}
          >
            <option value="">— Keine Angabe —</option>
            <option value="empfehlung">Empfehlung</option>
            <option value="linkedin">LinkedIn</option>
            <option value="event">Event</option>
            <option value="kaltakquise">Kaltakquise</option>
            <option value="inbound">Inbound</option>
            <option value="kampagne">Kampagne</option>
            <option value="netzwerk">Netzwerk</option>
            <option value="sonstige">Sonstige</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="source_detail">Quell-Detail</Label>
          <Input
            id="source_detail"
            name="source_detail"
            placeholder="z.B. Name des Empfehlers, Kampagne"
            defaultValue={company?.source_detail ?? ""}
          />
        </div>
      </div>

      <CampaignPicker
        value={campaignId}
        onChange={setCampaignId}
        helperText="Verknuepft die Firma mit einer Marketing-Kampagne fuer Attribution."
      />
      <input type="hidden" name="campaign_id" value={campaignId ?? ""} />

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
          defaultValue={company?.notes ?? ""}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending
          ? "Speichern..."
          : company
          ? "Aktualisieren"
          : "Erstellen"}
      </Button>
    </form>
  );
}
