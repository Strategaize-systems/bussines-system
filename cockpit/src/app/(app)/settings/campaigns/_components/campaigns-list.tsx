"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2, Archive, Megaphone, AlertCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { archiveCampaign, deleteCampaign, listCampaigns } from "../actions";
import {
  CAMPAIGN_STATUSES,
  CAMPAIGN_TYPES,
  type Campaign,
  type CampaignStatus,
  type CampaignType,
} from "@/types/campaign";

type ListItem = Campaign & { lead_count: number; deal_count: number };

const TYPE_LABELS: Record<CampaignType, string> = {
  email: "E-Mail",
  linkedin: "LinkedIn",
  event: "Event",
  ads: "Ads",
  referral: "Empfehlung",
  other: "Sonstiges",
};

function statusBadge(status: CampaignStatus) {
  const map: Record<CampaignStatus, { label: string; cls: string }> = {
    draft: { label: "Entwurf", cls: "bg-slate-100 text-slate-700" },
    active: { label: "Aktiv", cls: "bg-emerald-100 text-emerald-700" },
    finished: { label: "Beendet", cls: "bg-blue-100 text-blue-700" },
    archived: { label: "Archiviert", cls: "bg-amber-100 text-amber-700" },
  };
  const m = map[status];
  return (
    <Badge className={`${m.cls} hover:${m.cls}`}>{m.label}</Badge>
  );
}

function typeBadge(type: CampaignType) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 text-xs font-medium border border-violet-200">
      {TYPE_LABELS[type]}
    </span>
  );
}

function formatDateRange(start: string, end: string | null): string {
  const s = new Date(start).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  if (!end) return `ab ${s}`;
  const e = new Date(end).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${s} – ${e}`;
}

export function CampaignsList({ initial }: { initial: ListItem[] }) {
  const [items, setItems] = useState(initial);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [confirmDelete, setConfirmDelete] = useState<ListItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return items.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      return true;
    });
  }, [items, statusFilter, typeFilter]);

  async function refresh() {
    const next = await listCampaigns();
    setItems(next);
  }

  function handleArchive(c: ListItem) {
    setError(null);
    startTransition(async () => {
      const res = await archiveCampaign(c.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      await refresh();
    });
  }

  function handleDelete() {
    if (!confirmDelete) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteCampaign(confirmDelete.id);
      setConfirmDelete(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      await refresh();
    });
  }

  if (initial.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-violet-50 flex items-center justify-center">
          <Megaphone className="h-6 w-6 text-violet-600" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900">
          Noch keine Kampagnen
        </h3>
        <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
          Lege deine erste Kampagne an, um Leads, Deals und Won-Rate pro
          Kanal zu tracken (z.B. LinkedIn-Outbound, Q2-Mailing, Webinar-Funnel).
        </p>
        <div className="mt-6">
          <Link
            href="/settings/campaigns/new"
            className={buttonVariants({ variant: "default" })}
          >
            Erste Kampagne anlegen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
          <AlertCircle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Filter:
        </span>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {CAMPAIGN_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Typen</SelectItem>
            {CAMPAIGN_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto text-xs text-slate-500">
          {filtered.length} von {items.length} Kampagnen
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <article
            key={c.id}
            className="rounded-xl border-2 border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/campaigns/${c.id}`}
                  className="font-semibold text-slate-900 hover:text-violet-600 transition-colors block truncate"
                >
                  {c.name}
                </Link>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  {typeBadge(c.type)}
                  {statusBadge(c.status)}
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 mb-3">
              {formatDateRange(c.start_date, c.end_date)}
            </div>

            {c.channel && (
              <div className="text-sm text-slate-700 mb-3 truncate">
                <span className="text-slate-500">Channel: </span>
                {c.channel}
              </div>
            )}

            <div className="flex items-center gap-4 mb-4 text-sm">
              <div>
                <div className="text-2xl font-bold text-slate-900 tabular-nums">
                  {c.lead_count}
                </div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                  Leads
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 tabular-nums">
                  {c.deal_count}
                </div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                  Deals
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
              <Link
                href={`/settings/campaigns/${c.id}/edit`}
                className={`${buttonVariants({ variant: "ghost", size: "sm" })} gap-1`}
              >
                <Pencil className="h-3.5 w-3.5" />
                Bearbeiten
              </Link>
              {c.status !== "archived" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={() => handleArchive(c)}
                  disabled={isPending}
                >
                  <Archive className="h-3.5 w-3.5" />
                  Archivieren
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 ml-auto"
                onClick={() => setConfirmDelete(c)}
                disabled={isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Loeschen
              </Button>
            </div>
          </article>
        ))}
      </div>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kampagne loeschen?</DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <span className="block">
                Du loeschst <strong>{confirmDelete?.name}</strong> dauerhaft.
              </span>
              {confirmDelete && (confirmDelete.lead_count > 0 || confirmDelete.deal_count > 0) && (
                <span className="block rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                  <strong>Achtung:</strong> {confirmDelete.lead_count} Lead(s)
                  und {confirmDelete.deal_count} Deal(s) verlieren ihre
                  Kampagnen-Zuordnung. Empfohlen: stattdessen archivieren.
                </span>
              )}
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
