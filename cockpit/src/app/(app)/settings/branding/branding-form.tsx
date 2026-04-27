"use client";

import { useRef, useState, useTransition } from "react";
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
import {
  BRANDING_FONT_FAMILIES,
  type Branding,
  type BrandingFontFamily,
} from "@/types/branding";

const FONT_LABELS: Record<BrandingFontFamily, string> = {
  system: "System (Standard)",
  inter: "Inter",
  sans: "Arial / Sans-Serif",
  serif: "Georgia / Serif",
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
  const [savePending, startSave] = useTransition();
  const [uploadPending, startUpload] = useTransition();
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    formData.set("logo_url", logoUrl ?? "");
    formData.set("font_family", fontFamily);
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
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="primary_color">Primaerfarbe</Label>
          <Input
            id="primary_color"
            name="primary_color"
            type="color"
            defaultValue={initial?.primaryColor ?? "#4454b8"}
            className="h-10 w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="secondary_color">Sekundaerfarbe (optional)</Label>
          <Input
            id="secondary_color"
            name="secondary_color"
            type="color"
            defaultValue={initial?.secondaryColor ?? "#94a3b8"}
            className="h-10 w-full"
          />
        </div>
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
