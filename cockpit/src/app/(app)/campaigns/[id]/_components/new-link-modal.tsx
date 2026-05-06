"use client";

import { useState, useTransition } from "react";
import { Plus, Copy, Check, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCampaignLink } from "../actions";
import type { CampaignLink } from "@/types/campaign";

export function NewLinkModal({
  campaignId,
  appUrl,
  onCreated,
}: {
  campaignId: string;
  appUrl: string;
  onCreated: (link: CampaignLink) => void;
}) {
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<CampaignLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createCampaignLink({
        campaign_id: campaignId,
        target_url: String(fd.get("target_url") ?? ""),
        utm_source: String(fd.get("utm_source") ?? ""),
        utm_medium: String(fd.get("utm_medium") ?? ""),
        utm_campaign: String(fd.get("utm_campaign") ?? ""),
        utm_content: String(fd.get("utm_content") ?? "") || null,
        utm_term: String(fd.get("utm_term") ?? "") || null,
        label: String(fd.get("label") ?? "") || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCreated(res.link);
      onCreated(res.link);
    });
  }

  function reset() {
    setCreated(null);
    setCopied(false);
    setError(null);
  }

  function handleCopy(text: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleClose() {
    setOpen(false);
    setTimeout(reset, 200);
  }

  const trackingUrl = created
    ? `${appUrl.replace(/\/$/, "")}/r/${created.token}`
    : "";

  return (
    <>
      <Button
        type="button"
        variant="default"
        size="sm"
        className="gap-1"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-3.5 w-3.5" />
        Neuer Link
      </Button>
      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : handleClose())}>
      <DialogContent className="sm:max-w-lg">
        {!created ? (
          <>
            <DialogHeader>
              <DialogTitle>Tracking-Link erstellen</DialogTitle>
              <DialogDescription>
                Erstelle einen Tracking-Link mit UTM-Parametern. Klicks werden
                automatisch gezaehlt und Leads via UTM auf diese Kampagne
                gemappt.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="target_url">Ziel-URL *</Label>
                <Input
                  id="target_url"
                  name="target_url"
                  type="url"
                  placeholder="https://strategaize.com/landing"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="utm_source">utm_source *</Label>
                  <Input
                    id="utm_source"
                    name="utm_source"
                    placeholder="linkedin"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="utm_medium">utm_medium *</Label>
                  <Input
                    id="utm_medium"
                    name="utm_medium"
                    placeholder="social"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="utm_campaign">utm_campaign *</Label>
                <Input
                  id="utm_campaign"
                  name="utm_campaign"
                  placeholder="q2-outbound"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="utm_content">utm_content</Label>
                  <Input id="utm_content" name="utm_content" placeholder="post-1" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="utm_term">utm_term</Label>
                  <Input id="utm_term" name="utm_term" placeholder="cfo" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="label">Interner Label</Label>
                <Input
                  id="label"
                  name="label"
                  placeholder="Variante A — Headline kurz"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={handleClose} disabled={isPending}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Erstelle..." : "Link erstellen"}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Link erstellt</DialogTitle>
              <DialogDescription>
                Dein Tracking-Link ist bereit. Kopiere ihn und nutze ihn in
                E-Mails, LinkedIn-Posts oder Ads.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Tracking-URL</Label>
              <div className="flex items-stretch gap-2">
                <code className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-900 truncate">
                  {trackingUrl}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(trackingUrl)}
                  className="gap-1"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Kopiert
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Kopieren
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Token: <span className="font-mono">{created.token}</span> · Ziel: {created.target_url}
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Schliessen</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
