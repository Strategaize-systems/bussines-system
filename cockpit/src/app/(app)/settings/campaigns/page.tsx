import Link from "next/link";
import { Plus, Megaphone } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { listCampaigns } from "./actions";
import { CampaignsList } from "./_components/campaigns-list";

export const dynamic = "force-dynamic";

export default async function CampaignsSettingsPage() {
  const items = await listCampaigns();

  return (
    <main className="px-8 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kampagnen</h1>
          <p className="text-sm text-muted-foreground">
            Definiere Kampagnen fuer Lead- und Deal-Attribution. Verknuepfe
            Contacts, Companies und Deals mit Kampagnen, um Won-Rate pro Kanal
            zu messen.
          </p>
        </div>
        <Link
          href="/settings/campaigns/new"
          className={`${buttonVariants({ variant: "default" })} gap-2 shrink-0`}
        >
          <Plus className="h-4 w-4" />
          Neue Kampagne
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
            <Megaphone className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">Kampagnen-Liste</p>
            <p className="text-xs text-slate-500">
              Klick auf eine Kampagne fuer Detail-Ansicht mit KPIs (Leads,
              Deals, Won-Rate).
            </p>
          </div>
        </div>

        <CampaignsList initial={items} />
      </div>
    </main>
  );
}
