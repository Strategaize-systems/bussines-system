import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Users } from "lucide-react";

interface LeadRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  status: string | null;
  last_activity_at: string | null;
}

export async function LeadsTab({ campaignId }: { campaignId: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email, status, last_activity_at")
    .eq("campaign_id", campaignId)
    .order("last_activity_at", { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Fehler beim Laden der Leads: {error.message}
      </div>
    );
  }

  const leads = (data ?? []) as LeadRow[];

  if (leads.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-slate-200 bg-white p-8 text-center">
        <Users className="h-8 w-8 text-slate-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-700">
          Noch keine Leads dieser Kampagne zugeordnet
        </p>
        <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
          Verknuepfe Contacts in den Stammdaten ueber das Feld &ldquo;Kampagne&rdquo;
          oder ueber Auto-UTM-Mapping (in V6.2 SLC-625 verfuegbar).
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Name</th>
            <th className="px-4 py-3 text-left font-semibold">E-Mail</th>
            <th className="px-4 py-3 text-left font-semibold">Status</th>
            <th className="px-4 py-3 text-left font-semibold">Letzte Aktivitaet</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {leads.map((c) => {
            const name =
              [c.first_name, c.last_name].filter(Boolean).join(" ") ||
              c.email ||
              "—";
            return (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/contacts/${c.id}`}
                    className="font-medium text-slate-900 hover:text-violet-600"
                  >
                    {name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{c.email ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{c.status ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500 tabular-nums">
                  {c.last_activity_at
                    ? new Date(c.last_activity_at).toLocaleDateString("de-DE")
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
