"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SendEmailTemplateParams } from "@/types/automation";

export interface EmailTemplateOption {
  id: string;
  title: string;
}

export function SendEmailTemplateForm({
  params,
  templates,
  onChange,
}: {
  params: SendEmailTemplateParams;
  templates: EmailTemplateOption[];
  onChange: (p: SendEmailTemplateParams) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">E-Mail-Template</Label>
          <Select
            value={params.template_id ?? ""}
            onValueChange={(v) => onChange({ ...params, template_id: v ?? "" })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Template waehlen..." />
            </SelectTrigger>
            <SelectContent>
              {templates.length === 0 ? (
                <SelectItem value="-" disabled>
                  Keine Templates angelegt
                </SelectItem>
              ) : null}
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Versand-Modus</Label>
          <Select
            value={params.mode ?? "draft"}
            onValueChange={(v) =>
              onChange({
                ...params,
                mode: (v ?? "draft") as SendEmailTemplateParams["mode"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">
                Als Entwurf speichern (sicher)
              </SelectItem>
              <SelectItem value="direct">Direkt versenden</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Hinweis: Direkter Versand sendet nur, wenn der Trigger einen Kontakt
        mit E-Mail-Adresse hat. Bei fehlender SMTP-Konfiguration wird in
        beiden Modi als Entwurf gespeichert.
      </p>
    </div>
  );
}
