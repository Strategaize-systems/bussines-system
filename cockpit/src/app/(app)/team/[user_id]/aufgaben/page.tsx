// SLC-706 MT-5 — Drilldown Aufgaben Read-Only-Variant
//
// Liste der Tasks des Target-Members. Spec referenziert "aktivitaeten" —
// im Business-System ist die entsprechende Page /aufgaben mit tasks-Tabelle.
// Wir folgen der existierenden Konvention und benennen die Drilldown-Route
// gleich /team/[user_id]/aufgaben. Activities (separate Tabelle) sind nicht
// Teil von V7 Drilldown gem. Spec.

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";

interface PageProps {
  params: Promise<{ user_id: string }>;
}

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  priority: string | null;
  type: string | null;
  completed_at: string | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function badgeFor(status: string): string {
  if (status === "completed") return "bg-emerald-100 text-emerald-800";
  if (status === "waiting") return "bg-amber-100 text-amber-800";
  if (status === "cancelled") return "bg-slate-100 text-slate-600";
  return "bg-blue-100 text-blue-800";
}

const statusLabel: Record<string, string> = {
  open: "Offen",
  waiting: "Warten",
  completed: "Erledigt",
  cancelled: "Abgebrochen",
};

export default async function DrilldownAufgabenPage({ params }: PageProps) {
  const { user_id: targetUserId } = await params;
  const supabase = await createClient();

  const todayStr = new Date().toISOString().slice(0, 10);

  const { data: tasksData } = await supabase
    .from("tasks")
    .select("id, title, description, due_date, status, priority, type, completed_at")
    .eq("owner_user_id", targetUserId)
    .order("status", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(200);

  const tasks: TaskRow[] = (tasksData ?? []) as TaskRow[];

  const openTasks = tasks.filter((t) => t.status === "open" || t.status === "waiting");
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const overdueCount = openTasks.filter((t) => t.due_date && t.due_date < todayStr).length;

  return (
    <>
      <PageHeader
        title="Aufgaben (Drilldown)"
        subtitle="Read-Only-Sicht auf die Aufgaben dieses Mitarbeiters"
      />
      <main className="space-y-6 px-8 py-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <KpiCard label="Offen" value={openTasks.length.toString()} />
          <KpiCard label="Ueberfaellig" value={overdueCount.toString()} accent="rose" />
          <KpiCard label="Erledigt (Anzeige)" value={completedTasks.length.toString()} />
        </div>

        <Section title="Offene Aufgaben" empty={openTasks.length === 0}>
          <TaskTable tasks={openTasks} todayStr={todayStr} />
        </Section>

        <Section title="Erledigte Aufgaben (letzte)" empty={completedTasks.length === 0}>
          <TaskTable tasks={completedTasks.slice(0, 50)} todayStr={todayStr} />
        </Section>
      </main>
    </>
  );
}

function TaskTable({ tasks, todayStr }: { tasks: TaskRow[]; todayStr: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              Titel
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              Status
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              Faellig
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              Typ
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {tasks.map((t) => {
            const isOverdue = t.status !== "completed" && t.due_date && t.due_date < todayStr;
            return (
              <tr key={t.id}>
                <td className="px-4 py-2 text-sm">
                  <div className="font-medium text-slate-900">{t.title}</div>
                  {t.description && (
                    <div className="truncate text-xs text-slate-500">{t.description}</div>
                  )}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badgeFor(t.status)}`}
                  >
                    {statusLabel[t.status] ?? t.status}
                  </span>
                </td>
                <td
                  className={`px-4 py-2 text-xs ${isOverdue ? "font-semibold text-rose-700" : "text-slate-600"}`}
                >
                  {formatDate(t.due_date)}
                </td>
                <td className="px-4 py-2 text-xs text-slate-600">{t.type ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "rose";
}) {
  const accentClass = accent === "rose" ? "text-rose-700" : "text-slate-900";
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`text-2xl font-bold ${accentClass}`}>{value}</div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">{title}</h2>
      {empty ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          Keine Eintraege
        </div>
      ) : (
        children
      )}
    </section>
  );
}
