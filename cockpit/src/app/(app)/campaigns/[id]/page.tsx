import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Pencil,
  ArrowLeft,
  Megaphone,
  Users,
  Briefcase,
  Trophy,
  Coins,
  TrendingUp,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { KPICard, KPIGrid } from "@/components/ui/kpi-card";
import { getCampaign } from "../../settings/campaigns/actions";
import {
  type CampaignStatus,
  type CampaignType,
} from "@/types/campaign";
import { LeadsTab } from "./_components/leads-tab";
import { DealsTab } from "./_components/deals-tab";
import { TrackingLinksTab } from "./_components/tracking-links-tab";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<CampaignType, string> = {
  email: "E-Mail-Kampagne",
  linkedin: "LinkedIn",
  event: "Event / Messe",
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
  return <Badge className={`${m.cls} hover:${m.cls}`}>{m.label}</Badge>;
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

function fmtMoney(v: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  return (
    <main className="px-8 py-8 space-y-6">
      <div>
        <Link
          href="/settings/campaigns"
          className={`${buttonVariants({ variant: "ghost", size: "sm" })} mb-2 inline-flex gap-1`}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Zurueck zur Liste
        </Link>
      </div>

      <header className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 shrink-0">
                <Megaphone className="h-5 w-5 text-violet-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight truncate">
                {campaign.name}
              </h1>
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-violet-50 text-violet-700 text-xs font-semibold border border-violet-200">
                {TYPE_LABELS[campaign.type]}
              </span>
              {statusBadge(campaign.status)}
              <span className="text-sm text-slate-500">
                {formatDateRange(campaign.start_date, campaign.end_date)}
              </span>
              {campaign.channel && (
                <span className="text-sm text-slate-700">
                  · Channel: <strong>{campaign.channel}</strong>
                </span>
              )}
              {campaign.external_ref && (
                <span className="text-xs text-slate-500 font-mono">
                  ref: {campaign.external_ref}
                </span>
              )}
            </div>
            {campaign.notes && (
              <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">
                {campaign.notes}
              </p>
            )}
          </div>
          <Link
            href={`/settings/campaigns/${campaign.id}/edit`}
            className={`${buttonVariants({ variant: "outline", size: "sm" })} gap-2 shrink-0`}
          >
            <Pencil className="h-3.5 w-3.5" />
            Bearbeiten
          </Link>
        </div>
      </header>

      <KPIGrid columns={4}>
        <KPICard
          label="Leads"
          value={campaign.lead_count}
          icon={Users}
          gradient="blue"
        />
        <KPICard
          label="Deals"
          value={campaign.deal_count}
          icon={Briefcase}
          gradient="yellow"
        />
        <KPICard
          label="Won-Deals"
          value={campaign.won_count}
          icon={Trophy}
          gradient="green"
        />
        <KPICard
          label="Won-Value"
          value={fmtMoney(campaign.won_value)}
          icon={Coins}
          gradient="emerald"
        />
      </KPIGrid>

      <div className="rounded-xl border-2 border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Conversion Rate
            </p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">
              {campaign.conversion_rate === null
                ? "—"
                : `${campaign.conversion_rate.toFixed(1)} %`}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Won-Deals / Leads · benoetigt mindestens 1 Lead
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border-2 border-slate-200 bg-white p-5 shadow-sm">
        <Tabs defaultValue="leads" className="space-y-4">
          <TabsList>
            <TabsTrigger value="leads">
              Leads ({campaign.lead_count})
            </TabsTrigger>
            <TabsTrigger value="deals">
              Deals ({campaign.deal_count})
            </TabsTrigger>
            <TabsTrigger value="tracking-links">Tracking-Links</TabsTrigger>
          </TabsList>

          <TabsContent value="leads">
            <LeadsTab campaignId={campaign.id} />
          </TabsContent>
          <TabsContent value="deals">
            <DealsTab campaignId={campaign.id} />
          </TabsContent>
          <TabsContent value="tracking-links">
            <TrackingLinksTab />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
