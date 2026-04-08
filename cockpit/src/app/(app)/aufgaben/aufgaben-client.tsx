"use client";

import { useState, useMemo, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckSquare,
  AlertCircle,
  CheckCircle2,
  Phone,
  FileText,
  Mail,
  ChevronRight,
  Pencil,
  Trash2,
  Eye,
  Clock,
  Calendar,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard, KPIGrid } from "@/components/ui/kpi-card";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { TaskSheet } from "./task-sheet";
import { completeTask, deleteTask, type Task } from "./actions";
import Link from "next/link";

const priorityConfig: Record<string, { label: string; variant: string }> = {
  high: { label: "Hoch", variant: "bg-red-100 text-red-700 border-red-200" },
  medium: { label: "Mittel", variant: "bg-amber-100 text-amber-700 border-amber-200" },
  low: { label: "Niedrig", variant: "bg-green-100 text-green-700 border-green-200" },
};

const statusConfig: Record<string, { label: string; variant: string }> = {
  open: { label: "Offen", variant: "bg-blue-100 text-blue-700 border-blue-200" },
  completed: { label: "Erledigt", variant: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  waiting: { label: "Wartet", variant: "bg-slate-100 text-slate-600 border-slate-200" },
};

const typeIcons: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  task: CheckSquare,
  proposal: FileText,
  meeting: Calendar,
};

interface AufgabenClientProps {
  tasks: Task[];
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  deals: { id: string; title: string }[];
}

export function AufgabenClient({ tasks, contacts, companies, deals }: AufgabenClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showNewTask, setShowNewTask] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const openCount = tasks.filter((t) => t.status === "open").length;
  const overdueCount = tasks.filter(
    (t) => t.status === "open" && t.due_date && t.due_date < today
  ).length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  const filtered = useMemo(() => {
    let result = tasks;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q));
    }
    if (statusFilter) result = result.filter((t) => t.status === statusFilter);
    if (priorityFilter) result = result.filter((t) => t.priority === priorityFilter);
    return result;
  }, [tasks, searchQuery, statusFilter, priorityFilter]);

  return (
    <div className="min-h-screen">
      <PageHeader title="Aufgaben" subtitle={`${tasks.length} Aufgaben gesamt`}>
        <button
          onClick={() => setShowNewTask(true)}
          className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#00a84f] to-[#4dcb8b] text-white text-sm font-bold hover:shadow-lg transition-all flex items-center gap-2"
        >
          <Plus size={16} strokeWidth={2.5} />
          Aufgabe erstellen
        </button>
      </PageHeader>

      <main className="px-8 py-8">
        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* KPI Cards */}
          <KPIGrid columns={3}>
            <KPICard
              label="Offen"
              value={openCount}
              icon={CheckSquare}
              gradient="blue"
              href="/aufgaben"
            />
            <KPICard
              label="Überfällig"
              value={overdueCount}
              icon={AlertCircle}
              gradient="red"
              href="/aufgaben"
            />
            <KPICard
              label="Erledigt"
              value={completedCount}
              icon={CheckCircle2}
              gradient="green"
              href="/aufgaben"
            />
          </KPIGrid>

          {/* Filter Bar */}
          <FilterBar
            searchPlaceholder="Aufgaben durchsuchen..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
          >
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "", label: "Alle Status" },
                { value: "open", label: "Offen" },
                { value: "completed", label: "Erledigt" },
                { value: "waiting", label: "Wartet" },
              ]}
            />
            <FilterSelect
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={[
                { value: "", label: "Alle Prioritäten" },
                { value: "high", label: "Hoch" },
                { value: "medium", label: "Mittel" },
                { value: "low", label: "Niedrig" },
              ]}
            />
          </FilterBar>

          {/* Task List */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
            {filtered.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {filtered.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    today={today}
                    contacts={contacts}
                    companies={companies}
                    deals={deals}
                  />
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <CheckSquare size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-500">Keine Aufgaben gefunden</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* New Task Sheet */}
      {showNewTask && (
        <TaskSheet
          contacts={contacts}
          companies={companies}
          deals={deals}
          defaultOpen
          onOpenChange={(open) => { if (!open) setShowNewTask(false); }}
        />
      )}
    </div>
  );
}

function TaskRow({
  task,
  today,
  contacts,
  companies,
  deals,
}: {
  task: Task;
  today: string;
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  deals: { id: string; title: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const isOverdue = task.status === "open" && task.due_date && task.due_date < today;
  const prio = priorityConfig[task.priority] || priorityConfig.medium;
  const status = statusConfig[task.status] || statusConfig.open;
  const TypeIcon = typeIcons["task"] || CheckSquare;

  const handleComplete = () => {
    startTransition(async () => {
      await completeTask(task.id);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteTask(task.id);
    });
  };

  return (
    <div className={`flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors group ${isOverdue ? "bg-red-50/30" : ""}`}>
      {/* Type Icon */}
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
        isOverdue ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"
      }`}>
        <TypeIcon size={18} strokeWidth={2} />
      </div>

      {/* Title + Badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold text-slate-900 ${task.status === "completed" ? "line-through text-slate-400" : ""}`}>
            {task.title}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${status.variant}`}>
            {status.label}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${prio.variant}`}>
            🏁 {prio.label}
          </span>
          {isOverdue && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border bg-red-100 text-red-700 border-red-200">
              Überfällig
            </span>
          )}
        </div>
      </div>

      {/* Due Date */}
      <div className="text-right shrink-0 w-24">
        {task.due_date && (
          <>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Fällig</div>
            <div className={`text-xs font-semibold ${isOverdue ? "text-red-600" : "text-slate-700"}`}>
              {new Date(task.due_date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}.
            </div>
          </>
        )}
      </div>

      {/* Duration */}
      <div className="text-right shrink-0 w-16">
        <div className="text-[10px] font-bold text-slate-400 uppercase">Dauer</div>
        <div className="text-xs font-semibold text-slate-600 flex items-center gap-1 justify-end">
          <Clock size={10} />
          30 Min
        </div>
      </div>

      {/* Linked Company */}
      <div className="shrink-0">
        {task.companies ? (
          <Link
            href={`/companies/${task.companies.id}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {task.companies.name}
          </Link>
        ) : (
          <span className="text-xs text-slate-300">–</span>
        )}
      </div>

      {/* Assignee */}
      <div className="shrink-0 w-28 text-right">
        {task.contacts ? (
          <span className="text-xs font-medium text-slate-600">
            {task.contacts.first_name} {task.contacts.last_name}
          </span>
        ) : (
          <span className="text-xs text-slate-300">–</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <Eye size={14} />
        </button>
        <TaskSheet
          contacts={contacts}
          companies={companies}
          deals={deals}
          task={task}
          trigger={
            <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <Pencil size={14} />
            </button>
          }
        />
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
