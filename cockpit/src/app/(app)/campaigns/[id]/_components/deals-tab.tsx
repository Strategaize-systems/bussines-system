import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Briefcase, Download } from "lucide-react";

interface DealRow {
  id: string;
  title: string;
  value: number | null;
  status: string;
  stage_id: string | null;
}

const STATUS_CLS: Record<string, string> = {
  active: "bg-blue-100 text-blue-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-rose-100 text-rose-700",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Aktiv",
  won: "Gewonnen",
  lost: "Verloren",
};

function fmtMoney(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}

export async function DealsTab({ campaignId }: { campaignId: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select("id, title, value, status, stage_id")
    .eq("campaign_id", campaignId)
    .order("value", { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Fehler beim Laden der Deals: {error.message}
      </div>
    );
  }

  const deals = (data ?? []) as DealRow[];

  if (deals.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-slate-200 bg-white p-8 text-center">
        <Briefcase className="h-8 w-8 text-slate-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-700">
          Noch keine Deals dieser Kampagne zugeordnet
        </p>
        <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
          Beim Anlegen eines Deals kann die Kampagne im Form-Feld
          &ldquo;Kampagne&rdquo; gewaehlt werden. Wird beim Primary-Contact
          automatisch vorbelegt.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {deals.length} Deal{deals.length === 1 ? "" : "s"} dieser Kampagne
        </p>
        <a
          href={`/api/campaigns/${campaignId}/export?type=deals`}
          download
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </a>
      </div>
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Titel</th>
            <th className="px-4 py-3 text-right font-semibold">Wert</th>
            <th className="px-4 py-3 text-left font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {deals.map((d) => (
            <tr key={d.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link
                  href={`/deals/${d.id}`}
                  className="font-medium text-slate-900 hover:text-violet-600"
                >
                  {d.title}
                </Link>
              </td>
              <td className="px-4 py-3 text-right text-slate-700 tabular-nums">
                {fmtMoney(d.value)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_CLS[d.status] ?? "bg-slate-100 text-slate-700"}`}
                >
                  {STATUS_LABEL[d.status] ?? d.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
}
