"use client";

// V6.2 SLC-624 MT-6 — Wiederverwendbarer Kampagnen-Picker (FEAT-622)
//
// Wird in 3 Stammdaten-Edit-Forms eingebunden:
//   - contacts/[id]/edit-form.tsx
//   - companies/[id]/edit-form.tsx
//   - deals/new-deal-form.tsx (mit Auto-Vorbelegung via Primary-Contact)

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Megaphone, ExternalLink } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { listCampaignsForPicker } from "@/app/(app)/settings/campaigns/actions";
import type { CampaignPickerItem } from "@/types/campaign";

const TYPE_LABELS: Record<CampaignPickerItem["type"], string> = {
  email: "E-Mail",
  linkedin: "LinkedIn",
  event: "Event",
  ads: "Ads",
  referral: "Empfehlung",
  other: "Sonstiges",
};

export interface CampaignPickerProps {
  value: string | null;
  onChange: (id: string | null) => void;
  label?: string;
  helperText?: string;
  disabled?: boolean;
  id?: string;
}

const NONE_VALUE = "__none__";

export function CampaignPicker({
  value,
  onChange,
  label = "Kampagne",
  helperText,
  disabled,
  id = "campaign-picker",
}: CampaignPickerProps) {
  const [campaigns, setCampaigns] = useState<CampaignPickerItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listCampaignsForPicker(["draft", "active"])
      .then((items) => {
        if (!cancelled) setCampaigns(items);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Wenn der aktuelle value nicht in der Default-Liste ist (z.B. weil archived
  // oder finished), trotzdem als Item rendern damit der User sieht, was gesetzt
  // ist. Reine Ableitung aus props/state — kein Effect noetig.
  const orphanCampaign = useMemo<CampaignPickerItem | null>(() => {
    if (!value || !campaigns) return null;
    if (campaigns.find((c) => c.id === value)) return null;
    return {
      id: value,
      name: "(archivierte Kampagne)",
      type: "other",
      status: "archived",
    };
  }, [value, campaigns]);

  if (campaigns === null) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        <div className="h-10 rounded-md bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        <div className="text-sm text-rose-600">
          Fehler beim Laden der Kampagnen: {error}
        </div>
      </div>
    );
  }

  if (campaigns.length === 0 && !orphanCampaign) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-4 text-center">
          <Megaphone className="h-5 w-5 text-slate-400 mx-auto mb-1.5" />
          <p className="text-xs text-slate-600 mb-2">
            Noch keine Kampagnen vorhanden.
          </p>
          <Link
            href="/settings/campaigns"
            className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700"
          >
            Kampagne anlegen
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value ?? NONE_VALUE}
        onValueChange={(v) => onChange(v === NONE_VALUE ? null : v)}
        disabled={disabled}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder="Keine Kampagne" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>Keine Kampagne</SelectItem>
          {orphanCampaign && (
            <SelectGroup>
              <SelectLabel>Aktuelle Auswahl</SelectLabel>
              <SelectItem value={orphanCampaign.id}>
                {orphanCampaign.name}
              </SelectItem>
            </SelectGroup>
          )}
          {campaigns.length > 0 && (
            <SelectGroup>
              <SelectLabel>Aktive &amp; Entwuerfe</SelectLabel>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}{" "}
                  <span className="text-xs text-slate-500">
                    · {TYPE_LABELS[c.type]}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
      {helperText && (
        <p className="text-xs text-slate-500">{helperText}</p>
      )}
    </div>
  );
}
