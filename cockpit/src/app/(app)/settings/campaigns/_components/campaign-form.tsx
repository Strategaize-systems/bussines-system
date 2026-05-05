"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, ArrowLeft, AlertCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveCampaign } from "../actions";
import {
  CAMPAIGN_TYPES,
  CAMPAIGN_STATUSES,
  type CampaignType,
  type CampaignStatus,
  type SaveCampaignInput,
} from "@/types/campaign";

const TYPE_LABELS: Record<CampaignType, string> = {
  email: "E-Mail-Kampagne",
  linkedin: "LinkedIn",
  event: "Event / Messe",
  ads: "Ads (Google / LinkedIn / Meta)",
  referral: "Empfehlung",
  other: "Sonstiges",
};

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Entwurf",
  active: "Aktiv",
  finished: "Beendet",
  archived: "Archiviert",
};

export interface CampaignFormProps {
  initial: SaveCampaignInput;
  mode: "create" | "edit";
}

export function CampaignForm({ initial, mode }: CampaignFormProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<SaveCampaignInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof SaveCampaignInput>(
    key: K,
    value: SaveCampaignInput[K]
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function clientValidate(): string | null {
    const name = (draft.name ?? "").trim();
    if (name.length < 2) return "Name muss mindestens 2 Zeichen lang sein";
    if (!draft.start_date) return "Startdatum ist Pflicht";
    if (draft.end_date && draft.end_date < draft.start_date)
      return "Enddatum darf nicht vor dem Startdatum liegen";
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const clientErr = clientValidate();
    if (clientErr) {
      setError(clientErr);
      return;
    }

    startTransition(async () => {
      const res = await saveCampaign(draft);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/settings/campaigns");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
          <AlertCircle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      )}

      <div className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div>
          <Label htmlFor="name" className="text-sm font-semibold text-slate-700">
            Name <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="name"
            value={draft.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="z.B. Q2-2026 LinkedIn Outbound"
            maxLength={120}
            required
            className="mt-1.5"
          />
          <p className="mt-1 text-xs text-slate-500">
            Eindeutig (Gross-/Kleinschreibung wird ignoriert).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <Label htmlFor="type" className="text-sm font-semibold text-slate-700">
              Typ <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={draft.type}
              onValueChange={(v) => update("type", v as CampaignType)}
            >
              <SelectTrigger id="type" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="status" className="text-sm font-semibold text-slate-700">
              Status <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={draft.status}
              onValueChange={(v) => update("status", v as CampaignStatus)}
            >
              <SelectTrigger id="status" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="channel" className="text-sm font-semibold text-slate-700">
            Channel
          </Label>
          <Input
            id="channel"
            value={draft.channel ?? ""}
            onChange={(e) => update("channel", e.target.value || null)}
            placeholder="z.B. LinkedIn Sales Navigator, Mailjet, Google Ads"
            maxLength={120}
            className="mt-1.5"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <Label htmlFor="start_date" className="text-sm font-semibold text-slate-700">
              Startdatum <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="start_date"
              type="date"
              value={draft.start_date}
              onChange={(e) => update("start_date", e.target.value)}
              required
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="end_date" className="text-sm font-semibold text-slate-700">
              Enddatum
            </Label>
            <Input
              id="end_date"
              type="date"
              value={draft.end_date ?? ""}
              onChange={(e) => update("end_date", e.target.value || null)}
              min={draft.start_date}
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-slate-500">
              Optional. Muss &gt;= Startdatum sein.
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="external_ref" className="text-sm font-semibold text-slate-700">
            Externe Referenz
          </Label>
          <Input
            id="external_ref"
            value={draft.external_ref ?? ""}
            onChange={(e) => update("external_ref", e.target.value || null)}
            placeholder="z.B. UTM-Source-ID aus System 4"
            maxLength={200}
            className="mt-1.5"
          />
          <p className="mt-1 text-xs text-slate-500">
            Optional. Wird fuer System-4-Verlinkung genutzt (UTM-Match).
          </p>
        </div>

        <div>
          <Label htmlFor="notes" className="text-sm font-semibold text-slate-700">
            Notizen
          </Label>
          <Textarea
            id="notes"
            value={draft.notes ?? ""}
            onChange={(e) => update("notes", e.target.value || null)}
            placeholder="Interne Notizen, Briefing, Ziele..."
            rows={4}
            maxLength={5000}
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Link
          href="/settings/campaigns"
          className={`${buttonVariants({ variant: "ghost" })} gap-2`}
        >
          <ArrowLeft className="h-4 w-4" />
          Abbrechen
        </Link>
        <Button type="submit" disabled={isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {isPending
            ? "Speichern..."
            : mode === "create"
              ? "Kampagne anlegen"
              : "Speichern"}
        </Button>
      </div>
    </form>
  );
}
