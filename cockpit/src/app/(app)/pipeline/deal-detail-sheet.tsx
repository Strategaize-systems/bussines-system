"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DealForm } from "./deal-form";
import { getDealWithRelations, updateDeal, deleteDeal } from "./actions";
import type { Deal, PipelineStage } from "./actions";
import {
  User, Building2, Mail, Phone, Briefcase, Calendar,
  ArrowRightLeft, FileText, Zap, Trash2, Pencil,
  MessageSquare, Clock,
} from "lucide-react";
import Link from "next/link";

const fmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Aktiv", color: "bg-blue-100 text-blue-800" },
  won: { label: "Gewonnen", color: "bg-green-100 text-green-800" },
  lost: { label: "Verloren", color: "bg-red-100 text-red-800" },
};

const signalLabels: Record<string, string> = {
  hohes_interesse: "Hohes Interesse",
  budgetsignal: "Budget",
  einwand: "Einwand",
  interne_blockade: "Blockade",
  champion_vorhanden: "Champion",
  timing_ungeeignet: "Timing",
  falscher_fit: "Kein Fit",
  akuter_druck: "Druck",
  hoher_multiplikatorwert: "Multi-Wert",
};

interface DealDetailSheetProps {
  deal: Deal | null;
  stages: PipelineStage[];
  pipelineId: string;
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  open: boolean;
  onClose: () => void;
}

export function DealDetailSheet({
  deal,
  stages,
  pipelineId,
  contacts,
  companies,
  open,
  onClose,
}: DealDetailSheetProps) {
  const [tab, setTab] = useState<"details" | "activities" | "proposals" | "edit">("details");
  const [relations, setRelations] = useState<Awaited<ReturnType<typeof getDealWithRelations>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [editError, setEditError] = useState("");

  useEffect(() => {
    if (deal && open) {
      setLoading(true);
      setTab("details");
      getDealWithRelations(deal.id).then((data) => {
        setRelations(data);
        setLoading(false);
      });
    } else {
      setRelations(null);
    }
  }, [deal?.id, open]);

  const handleEditSubmit = (formData: FormData) => {
    if (!deal) return;
    setEditError("");
    startTransition(async () => {
      const result = await updateDeal(deal.id, formData);
      if (result.error) {
        setEditError(result.error);
      } else {
        onClose();
      }
    });
  };

  const handleDelete = () => {
    if (!deal) return;
    startTransition(async () => {
      const result = await deleteDeal(deal.id);
      if (!result.error) onClose();
    });
  };

  const d = relations?.deal;
  const st = deal ? statusConfig[deal.status] ?? statusConfig.active : statusConfig.active;
  const stageName = deal ? stages.find((s) => s.id === deal.stage_id)?.name ?? "" : "";

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent>
        <SheetHeader>
          <div className="flex items-center gap-3">
            <SheetTitle>{deal?.title ?? "Deal"}</SheetTitle>
            {deal && (
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.color}`}>
                {st.label}
              </span>
            )}
          </div>
          {deal && (
            <p className="text-sm text-slate-500">
              {stageName} · {deal.value != null ? fmt.format(deal.value) : "Kein Wert"}
            </p>
          )}
        </SheetHeader>

        {/* Tabs */}
        <div className="flex gap-1 px-8 py-2 border-b border-slate-100">
          {(["details", "activities", "proposals", "edit"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                tab === t
                  ? "bg-[#4454b8] text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              }`}
            >
              {t === "details" ? "Übersicht" : t === "activities" ? "Aktivitäten" : t === "proposals" ? "Angebote" : "Bearbeiten"}
            </button>
          ))}
        </div>

        <div className="px-8 pb-8 pt-4">
          {loading ? (
            <p className="text-sm text-slate-400 py-8 text-center">Laden...</p>
          ) : tab === "details" ? (
            <DetailsTab deal={d} relations={relations} stageName={stageName} />
          ) : tab === "activities" ? (
            <ActivitiesTab activities={relations?.activities ?? []} />
          ) : tab === "proposals" ? (
            <ProposalsTab proposals={relations?.proposals ?? []} emails={relations?.emails ?? []} />
          ) : (
            <div className="space-y-4">
              {editError && <p className="text-sm text-destructive">{editError}</p>}
              {deal && (
                <DealForm
                  deal={deal}
                  stages={stages}
                  pipelineId={pipelineId}
                  contacts={contacts}
                  companies={companies}
                  onSubmit={handleEditSubmit}
                  isPending={isPending}
                />
              )}
              <div className="border-t pt-4">
                <Button variant="destructive" size="sm" className="w-full" onClick={handleDelete} disabled={isPending}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Deal löschen
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ── Details Tab ─────────────────────────────────────────── */

function DetailsTab({ deal, relations, stageName }: { deal: any; relations: any; stageName: string }) {
  if (!deal) return null;

  return (
    <div className="space-y-6">
      {/* Contact & Company */}
      <div className="grid grid-cols-2 gap-4">
        {deal.contacts && (
          <div className="rounded-xl border border-slate-200 p-4 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#4454b8]">Kontakt</div>
            <Link href={`/contacts/${deal.contacts.id}`} className="text-sm font-semibold text-slate-900 hover:underline">
              {deal.contacts.first_name} {deal.contacts.last_name}
            </Link>
            {deal.contacts.position && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Briefcase className="h-3 w-3" /> {deal.contacts.position}
              </div>
            )}
            {deal.contacts.email && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Mail className="h-3 w-3" /> {deal.contacts.email}
              </div>
            )}
            {deal.contacts.phone && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Phone className="h-3 w-3" /> {deal.contacts.phone}
              </div>
            )}
          </div>
        )}
        {deal.companies && (
          <div className="rounded-xl border border-slate-200 p-4 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#4454b8]">Firma</div>
            <Link href={`/companies/${deal.companies.id}`} className="text-sm font-semibold text-slate-900 hover:underline">
              {deal.companies.name}
            </Link>
            {deal.companies.industry && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Building2 className="h-3 w-3" /> {deal.companies.industry}
              </div>
            )}
            {deal.companies.email && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Mail className="h-3 w-3" /> {deal.companies.email}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Deal Info */}
      <div className="rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#4454b8]">Deal-Details</div>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-slate-500">Stage</span>
          <span className="font-medium">{stageName}</span>
          {deal.opportunity_type && (
            <>
              <span className="text-slate-500">Opportunity-Typ</span>
              <span className="font-medium">{deal.opportunity_type}</span>
            </>
          )}
          {deal.expected_close_date && (
            <>
              <span className="text-slate-500">Erw. Abschluss</span>
              <span className="font-medium">{new Date(deal.expected_close_date).toLocaleDateString("de-DE")}</span>
            </>
          )}
          {deal.next_action && (
            <>
              <span className="text-slate-500">Nächste Aktion</span>
              <span className="font-medium">{deal.next_action}</span>
            </>
          )}
          {deal.next_action_date && (
            <>
              <span className="text-slate-500">Nächste Aktion am</span>
              <span className="font-medium">{new Date(deal.next_action_date).toLocaleDateString("de-DE")}</span>
            </>
          )}
          {deal.won_lost_reason && (
            <>
              <span className="text-slate-500">{deal.status === "won" ? "Gewinngrund" : "Verlustgrund"}</span>
              <span className="font-medium">{deal.won_lost_reason}</span>
            </>
          )}
        </div>
      </div>

      {/* Signals */}
      {relations?.signals?.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#4454b8]">Signale</div>
          <div className="flex flex-wrap gap-1.5">
            {relations.signals.map((s: any) => (
              <Badge key={s.id} variant="secondary" className="text-xs">
                <Zap className="mr-1 h-3 w-3" />
                {signalLabels[s.signal_type] ?? s.signal_type}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {deal.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {deal.tags.map((tag: string) => (
            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Activities Tab ──────────────────────────────────────── */

function ActivitiesTab({ activities }: { activities: any[] }) {
  const typeIcons: Record<string, typeof MessageSquare> = {
    note: MessageSquare,
    call: Phone,
    email: Mail,
    meeting: User,
    stage_change: ArrowRightLeft,
    task: Clock,
  };

  return (
    <div className="space-y-3">
      {activities.length > 0 ? (
        activities.map((a: any) => {
          const Icon = typeIcons[a.type] || MessageSquare;
          return (
            <div key={a.id} className="flex gap-3 py-2 border-b border-slate-50 last:border-0">
              <div className="rounded-lg bg-slate-50 p-1.5 shrink-0 text-slate-500">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-slate-700">{a.title || a.type}</p>
                {a.summary && <p className="text-xs text-slate-500 mt-0.5">{a.summary}</p>}
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {new Date(a.created_at).toLocaleDateString("de-DE", {
                    day: "2-digit", month: "2-digit", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-sm text-slate-400 py-4 text-center">Keine Aktivitäten.</p>
      )}
    </div>
  );
}

/* ── Proposals + Emails Tab ──────────────────────────────── */

function ProposalsTab({ proposals, emails }: { proposals: any[]; emails: any[] }) {
  const proposalStatus: Record<string, string> = {
    draft: "Entwurf", sent: "Versendet", open: "Offen",
    negotiation: "Verhandlung", won: "Gewonnen", lost: "Verloren",
  };

  return (
    <div className="space-y-6">
      {/* Proposals */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#4454b8]">Angebote</div>
        {proposals.length > 0 ? (
          proposals.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <div>
                <span className="text-sm font-medium">{p.title}</span>
                <span className="ml-2 text-xs text-slate-400">V{p.version}</span>
              </div>
              <div className="flex items-center gap-2">
                {p.price_range && <span className="text-xs text-slate-500">{p.price_range}</span>}
                <Badge variant="outline" className="text-[10px]">
                  {proposalStatus[p.status] ?? p.status}
                </Badge>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-400">Keine Angebote.</p>
        )}
      </div>

      {/* Emails */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#4454b8]">E-Mails</div>
        {emails.length > 0 ? (
          emails.map((e: any) => (
            <div key={e.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium truncate">{e.subject || "(Kein Betreff)"}</span>
                <div className="text-xs text-slate-400 mt-0.5">
                  An: {e.to_address} · {e.sent_at ? new Date(e.sent_at).toLocaleDateString("de-DE") : "Entwurf"}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-400">Keine E-Mails.</p>
        )}
      </div>
    </div>
  );
}
