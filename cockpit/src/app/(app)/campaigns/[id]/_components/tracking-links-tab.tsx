"use client";

import { useState, useTransition } from "react";
import {
  Trash2,
  Copy,
  Check,
  Link2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteCampaignLink } from "../actions";
import { NewLinkModal } from "./new-link-modal";
import { ClicksChart } from "./clicks-chart";
import type { CampaignLink } from "@/types/campaign";

export function TrackingLinksTab({
  campaignId,
  appUrl,
  initialLinks,
  clicksLast30Days,
}: {
  campaignId: string;
  appUrl: string;
  initialLinks: CampaignLink[];
  clicksLast30Days: Array<{ date: string; count: number }>;
}) {
  const [links, setLinks] = useState<CampaignLink[]>(initialLinks);
  const [confirmDelete, setConfirmDelete] = useState<CampaignLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const baseUrl = appUrl.replace(/\/$/, "");

  function handleCopy(link: CampaignLink) {
    const url = `${baseUrl}/r/${link.token}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopiedToken(link.token);
      setTimeout(() => setCopiedToken(null), 2000);
    });
  }

  function handleDelete() {
    if (!confirmDelete) return;
    setError(null);
    const target = confirmDelete;
    startTransition(async () => {
      const res = await deleteCampaignLink(target.id, campaignId);
      setConfirmDelete(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setLinks((prev) => prev.filter((l) => l.id !== target.id));
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Tracking-Links
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Token-basierte Redirects mit UTM-Parametern · Klicks werden
            automatisch gezaehlt · Leads via UTM auf Kampagne gemappt.
          </p>
        </div>
        <NewLinkModal
          campaignId={campaignId}
          appUrl={baseUrl}
          onCreated={(link) => setLinks((prev) => [link, ...prev])}
        />
      </div>

      <ClicksChart data={clicksLast30Days} />

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
          <AlertCircle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      )}

      {links.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-violet-200 bg-violet-50/30 p-8 text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center">
            <Link2 className="h-5 w-5 text-violet-600" />
          </div>
          <h4 className="mt-3 text-base font-semibold text-slate-900">
            Noch keine Tracking-Links
          </h4>
          <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
            Lege deinen ersten Tracking-Link an. Du bekommst eine Token-URL
            wie <code className="font-mono">{baseUrl}/r/aZ3-x9Qk</code> die du
            in E-Mails, LinkedIn-Posts oder Ads verwenden kannst.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-violet-200 text-xs font-medium text-violet-700">
            <Sparkles className="h-3.5 w-3.5" />
            Klicke oben auf &ldquo;Neuer Link&rdquo;
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => {
            const trackingUrl = `${baseUrl}/r/${link.token}`;
            return (
              <div
                key={link.id}
                className="rounded-xl border-2 border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    {link.label && (
                      <p className="text-sm font-semibold text-slate-900">
                        {link.label}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 truncate">
                      Ziel: <a href={link.target_url} target="_blank" rel="noreferrer" className="text-violet-600 hover:underline">{link.target_url}</a>
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono">
                        source={link.utm_source}
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono">
                        medium={link.utm_medium}
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono">
                        campaign={link.utm_campaign}
                      </span>
                      {link.utm_content && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono">
                          content={link.utm_content}
                        </span>
                      )}
                      {link.utm_term && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono">
                          term={link.utm_term}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold text-slate-900 tabular-nums">
                      {link.click_count}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                      Klicks
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-stretch gap-2">
                  <code className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-mono text-slate-900 truncate">
                    {trackingUrl}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(link)}
                    className="gap-1 shrink-0"
                  >
                    {copiedToken === link.token ? (
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(link)}
                    disabled={isPending}
                    className="gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tracking-Link loeschen?</DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <span className="block">
                Du loeschst{" "}
                <strong>
                  {confirmDelete?.label ??
                    `Token ${confirmDelete?.token}`}
                </strong>{" "}
                dauerhaft.
              </span>
              {confirmDelete && confirmDelete.click_count > 0 && (
                <span className="block rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                  <strong>Achtung:</strong> {confirmDelete.click_count} Klick(s)
                  und das vollstaendige Click-Log werden ebenfalls geloescht
                  (CASCADE).
                </span>
              )}
              <span className="block">
                Bestehende Token-URLs werden danach 404 zurueckgeben.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(null)}
              disabled={isPending}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Loesche..." : "Endgueltig loeschen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
