"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload } from "lucide-react";
import { ConditionalColorPicker } from "@/components/branding/conditional-color-picker";
import {
  BRANDING_FONT_FAMILIES,
  BUSINESS_COUNTRIES,
  type Branding,
  type BrandingFontFamily,
  type BusinessCountry,
} from "@/types/branding";
import { validateDeVatId, validateNlVatId } from "@/lib/validation/vat-id";

const PRIMARY_DEFAULT = "#4454b8";
const SECONDARY_DEFAULT = "#94a3b8";

const FONT_LABELS: Record<BrandingFontFamily, string> = {
  system: "System (Standard)",
  inter: "Inter",
  sans: "Arial / Sans-Serif",
  serif: "Georgia / Serif",
};

const COUNTRY_LABELS: Record<BusinessCountry, string> = {
  NL: "Niederlande (NL) — Standard 21%, reduziert 9%",
  DE: "Deutschland (DE) — Standard 19%, reduziert 7%",
};

const VAT_ID_LABELS: Record<BusinessCountry, string> = {
  NL: "BTW-Nummer",
  DE: "USt-IdNr.",
};

const VAT_ID_PLACEHOLDERS: Record<BusinessCountry, string> = {
  NL: "NL123456789B01",
  DE: "DE123456789",
};

interface Props {
  initial: Branding | null;
  onSave: (formData: FormData) => Promise<{ error: string }>;
  onUploadLogo: (
    formData: FormData,
  ) => Promise<{ error: string; logoUrl?: string }>;
}

export function BrandingForm({ initial, onSave, onUploadLogo }: Props) {
  const [logoUrl, setLogoUrl] = useState<string | null>(initial?.logoUrl ?? null);
  const [fontFamily, setFontFamily] = useState<BrandingFontFamily>(
    initial?.fontFamily ?? "system",
  );
  const [primaryColor, setPrimaryColor] = useState<string | null>(
    initial?.primaryColor ?? null,
  );
  const [secondaryColor, setSecondaryColor] = useState<string | null>(
    initial?.secondaryColor ?? null,
  );
  const [businessCountry, setBusinessCountry] = useState<BusinessCountry>(
    initial?.businessCountry ?? "NL",
  );
  const [vatId, setVatId] = useState<string>(initial?.vatId ?? "");
  const [savePending, startSave] = useTransition();
  const [uploadPending, startUpload] = useTransition();
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const vatIdInlineError = useMemo(() => {
    const trimmed = vatId.trim();
    if (!trimmed) return null;
    const result =
      businessCountry === "DE"
        ? validateDeVatId(trimmed)
        : validateNlVatId(trimmed);
    return result.valid ? null : result.error;
  }, [vatId, businessCountry]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setInfo("");
    const fd = new FormData();
    fd.append("file", file);
    startUpload(async () => {
      const result = await onUploadLogo(fd);
      if (result.error) {
        setError(result.error);
      } else if (result.logoUrl) {
        setLogoUrl(result.logoUrl);
        setInfo("Logo aktualisiert.");
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  };

  const handleSubmit = (formData: FormData) => {
    setError("");
    setInfo("");
    if (vatIdInlineError) {
      setError(vatIdInlineError);
      return;
    }
    formData.set("logo_url", logoUrl ?? "");
    formData.set("font_family", fontFamily);
    // Conditional Color-Picker: NULL bei Toggle aus, Hex bei Toggle an.
    // sanitizeColor (actions.ts) mappt empty-string → NULL.
    formData.set("primary_color", primaryColor ?? "");
    formData.set("secondary_color", secondaryColor ?? "");
    formData.set("business_country", businessCountry);
    formData.set("vat_id", vatId.trim());
    startSave(async () => {
      const result = await onSave(formData);
      if (result.error) setError(result.error);
      else setInfo("Branding gespeichert.");
    });
  };

  const contact = initial?.contactBlock;

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Logo */}
      <div className="space-y-2">
        <Label>Logo</Label>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-32 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="max-h-12 max-w-[7rem]" />
            ) : (
              <span className="text-xs text-slate-400">kein Logo</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleFile}
              className="hidden"
              id="logo-upload"
            />
            <Label htmlFor="logo-upload">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadPending}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Logo hochladen
              </Button>
            </Label>
            <p className="text-xs text-slate-400">
              PNG, JPG, SVG oder WebP, max 2 MB.
            </p>
            {logoUrl && (
              <button
                type="button"
                className="text-left text-xs text-slate-400 underline-offset-2 hover:underline"
                onClick={() => {
                  setLogoUrl(null);
                  setInfo("Logo wird beim Speichern entfernt.");
                }}
              >
                Logo entfernen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Farben */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ConditionalColorPicker
          id="primary_color"
          label="Primaerfarbe"
          value={primaryColor}
          onChange={setPrimaryColor}
          defaultColor={PRIMARY_DEFAULT}
        />
        <ConditionalColorPicker
          id="secondary_color"
          label="Sekundaerfarbe (optional)"
          value={secondaryColor}
          onChange={setSecondaryColor}
          defaultColor={SECONDARY_DEFAULT}
        />
      </div>

      {/* Schrift */}
      <div className="space-y-2">
        <Label htmlFor="font_family">Schriftfamilie</Label>
        <Select
          value={fontFamily}
          onValueChange={(v) => setFontFamily(v as BrandingFontFamily)}
        >
          <SelectTrigger id="font_family">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BRANDING_FONT_FAMILIES.map((f) => (
              <SelectItem key={f} value={f}>
                {FONT_LABELS[f]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kontakt-Block */}
      <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50/40 p-4">
        <p className="text-xs font-medium uppercase text-slate-500">
          Kontakt-Block (Footer)
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="contact_name">Name</Label>
            <Input
              id="contact_name"
              name="contact_name"
              defaultValue={contact?.name ?? ""}
              placeholder="Max Mustermann"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="contact_company">Firma</Label>
            <Input
              id="contact_company"
              name="contact_company"
              defaultValue={contact?.company ?? ""}
              placeholder="Strategaize GmbH"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="contact_phone">Telefon</Label>
            <Input
              id="contact_phone"
              name="contact_phone"
              defaultValue={contact?.phone ?? ""}
              placeholder="+49 30 1234567"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="contact_web">Web</Label>
            <Input
              id="contact_web"
              name="contact_web"
              defaultValue={contact?.web ?? ""}
              placeholder="https://strategaize.de"
            />
          </div>
        </div>
      </div>

      {/* Footer-Markdown */}
      <div className="space-y-2">
        <Label htmlFor="footer_markdown">Footer-Text (optional)</Label>
        <Textarea
          id="footer_markdown"
          name="footer_markdown"
          rows={4}
          defaultValue={initial?.footerMarkdown ?? ""}
          placeholder="Strategaize GmbH | Musterstrasse 1, 12345 Berlin | HRB 123456"
        />
        <p className="text-xs text-slate-400">
          Erscheint unter dem Kontakt-Block. Zeilenumbrueche werden uebernommen.
        </p>
      </div>

      {/* Steuerliche Grund-Einstellung (V5.7) */}
      <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50/40 p-4">
        <p className="text-xs font-medium uppercase text-slate-500">
          Steuer-Einstellungen
        </p>
        <div className="space-y-2">
          <Label htmlFor="business_country">Firmensitz / Rechnungsland</Label>
          <Select
            value={businessCountry}
            onValueChange={(v) => setBusinessCountry(v as BusinessCountry)}
          >
            <SelectTrigger id="business_country">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {COUNTRY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-400">
            Steuert die Default-Mehrwertsteuer und das Format der Steuernummer.
            Wechsel ist moeglich, aber bewusst — bestehende Angebote behalten
            ihre Werte (Snapshot-Prinzip).
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="vat_id">{VAT_ID_LABELS[businessCountry]} (optional)</Label>
          <Input
            id="vat_id"
            name="vat_id"
            value={vatId}
            onChange={(e) => setVatId(e.target.value)}
            placeholder={VAT_ID_PLACEHOLDERS[businessCountry]}
          />
          {vatIdInlineError ? (
            <p className="text-xs text-destructive">{vatIdInlineError}</p>
          ) : (
            <p className="text-xs text-slate-400">
              Erscheint im PDF-Footer und ist Voraussetzung fuer Reverse-Charge-Angebote (NL).
            </p>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {info && !error && <p className="text-sm text-emerald-600">{info}</p>}

      <Button type="submit" disabled={savePending}>
        {savePending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Speichern...
          </>
        ) : (
          "Branding speichern"
        )}
      </Button>
    </form>
  );
}
