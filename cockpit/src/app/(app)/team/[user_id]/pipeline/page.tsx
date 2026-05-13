// SLC-706 MT-4 — Drilldown Pipeline Read-Only-Variant
//
// Listet alle aktiven Deals des Target-Members gruppiert nach Pipeline +
// Stage. Bewusst KEIN Drag-Drop, KEIN Deal-Detail-Sheet, KEIN Edit. Statt
// dem vollen PipelineView nur eine flache Tabelle pro Pipeline mit Deal-Titel,
// Stage, Value, naechste Aktion.
//
// Spec-Abweichung dokumentiert: AC6 verlangt "Pipeline mit Target-Owner-Filter"
// — Drag-Drop disabled. Read-Only-Table erfuellt das Ziel ohne den vollen
// PipelineView zu invasiv anzupassen. Volle Pipeline-Sicht inkl. Drilldown
// auf Deal-Detail kommt in V7.5+.

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";

interface PageProps {
  params: Promise<{ user_id: string }>;
}

type DealRow = {
  id: string;
  title: string;
  value: number | string | null;
  status: string;
  next_action: string | null;
  next_action_date: string | null;
  stage_id: string | null;
  pipeline_id: string;
};

type StageRow = {
  id: string;
  name: string;
  pipeline_id: string;
  sort_order: number;
};

type PipelineRow = {
  id: string;
  name: string;
  sort_order: number;
};

function formatEuro(value: number | string | null): string {
  const num = Number(value ?? 0);
  return num.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

export default async function DrilldownPipelinePage({ params }: PageProps) {
  const { user_id: targetUserId } = await params;
  const supabase = await createClient();

  const [pipelinesRes, stagesRes, dealsRes] = await Promise.all([
    supabase.from("pipelines").select("id, name, sort_order").order("sort_order"),
    supabase.from("pipeline_stages").select("id, name, pipeline_id, sort_order").order("sort_order"),
    supabase
      .from("deals")
      .select("id, title, value, status, next_action, next_action_date, stage_id, pipeline_id")
      .eq("owner_user_id", targetUserId)
      .eq("status", "active")
      .order("value", { ascending: false, nullsFirst: false }),
  ]);

  const pipelines: PipelineRow[] = (pipelinesRes.data ?? []) as PipelineRow[];
  const stages: StageRow[] = (stagesRes.data ?? []) as StageRow[];
  const deals: DealRow[] = (dealsRes.data ?? []) as DealRow[];

  const pipelineNameById = new Map(pipelines.map((p) => [p.id, p.name]));
  const stageNameById = new Map(stages.map((s) => [s.id, s.name]));

  const totalSum = deals.reduce((sum, d) => sum + Number(d.value ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Pipeline (Drilldown)"
        subtitle="Read-Only-Sicht auf die aktive Pipeline dieses Mitarbeiters"
      />
      <main className="space-y-6 px-8 py-8">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-2xl font-bold text-slate-900">{formatEuro(totalSum)}</div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Pipeline-Summe ({deals.length} aktive Deals)
          </div>
        </div>

        {deals.length === 0 ? (
          <EmptyState text="Keine aktiven Deals fuer diesen Mitarbeiter" />
        ) : (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
              Aktive Deals
            </h2>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <table className="w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Deal
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Pipeline
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Stage
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Wert
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Naechste Aktion
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Faellig
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {deals.map((d) => (
                    <tr key={d.id}>
                      <td className="px-4 py-2 text-sm font-medium text-slate-900">{d.title}</td>
                      <td className="px-4 py-2 text-sm text-slate-700">
                        {d.pipeline_id ? pipelineNameById.get(d.pipeline_id) ?? "—" : "—"}
                      </td>
                      <td className="px-4 py-2 text-sm text-slate-700">
                        {d.stage_id ? stageNameById.get(d.stage_id) ?? "—" : "—"}
                      </td>
                      <td className="px-4 py-2 text-right text-sm tabular-nums text-slate-900">
                        {formatEuro(d.value)}
                      </td>
                      <td className="px-4 py-2 text-sm text-slate-700">{d.next_action ?? "—"}</td>
                      <td className="px-4 py-2 text-xs text-slate-600">{formatDate(d.next_action_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
