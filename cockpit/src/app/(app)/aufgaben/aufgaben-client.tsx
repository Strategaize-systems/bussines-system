"use client";

import { useState, useMemo, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Check,
  Trash2,
  Pencil,
  User,
  Building2,
  Calendar,
  AlertCircle,
  ListTodo,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { TaskSheet } from "./task-sheet";
import { completeTask, deleteTask, type Task } from "./actions";
import Link from "next/link";

const selectClass =
  "flex h-8 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const priorityConfig: Record<string, { label: string; color: string }> = {
  high: { label: "Hoch", color: "bg-red-100 text-red-800" },
  medium: { label: "Mittel", color: "bg-yellow-100 text-yellow-800" },
  low: { label: "Niedrig", color: "bg-green-100 text-green-800" },
};

interface AufgabenClientProps {
  tasks: Task[];
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  deals: { id: string; title: string }[];
}

export function AufgabenClient({ tasks, contacts, companies, deals }: AufgabenClientProps) {
  const [statusFilter, setStatusFilter] = useState("open");
  const [priorityFilter, setPriorityFilter] = useState("");

  const filtered = useMemo(() => {
    let result = tasks;
    if (statusFilter) result = result.filter((t) => t.status === statusFilter);
    if (priorityFilter) result = result.filter((t) => t.priority === priorityFilter);
    return result;
  }, [tasks, statusFilter, priorityFilter]);

  const today = new Date().toISOString().split("T")[0];
  const openCount = tasks.filter((t) => t.status === "open").length;
  const overdueCount = tasks.filter(
    (t) => t.status === "open" && t.due_date && t.due_date < today
  ).length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Aufgaben</h1>
          <p className="text-sm text-muted-foreground">
            {tasks.length} Aufgaben gesamt
          </p>
        </div>
        <TaskSheet contacts={contacts} companies={companies} deals={deals} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <ListTodo className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-2xl font-bold">{openCount}</div>
              <div className="text-xs text-muted-foreground">Offen</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div>
              <div className="text-2xl font-bold">{overdueCount}</div>
              <div className="text-xs text-muted-foreground">Überfällig</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div>
              <div className="text-2xl font-bold">{completedCount}</div>
              <div className="text-xs text-muted-foreground">Erledigt</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={selectClass}
        >
          <option value="">Alle Status</option>
          <option value="open">Offen</option>
          <option value="completed">Erledigt</option>
          <option value="waiting">Wartet</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className={selectClass}
        >
          <option value="">Alle Prioritäten</option>
          <option value="high">Hoch</option>
          <option value="medium">Mittel</option>
          <option value="low">Niedrig</option>
        </select>
        <span className="text-sm text-muted-foreground">
          {filtered.length} Aufgaben
        </span>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {filtered.length > 0 ? (
          filtered.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              today={today}
              contacts={contacts}
              companies={companies}
              deals={deals}
            />
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Keine Aufgaben gefunden.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function TaskItem({
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
  const isCompleted = task.status === "completed";
  const prio = priorityConfig[task.priority] ?? priorityConfig.medium;

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
    <Card className={isOverdue ? "border-red-300 bg-red-50/50" : ""}>
      <CardContent className="flex items-start gap-3 p-3">
        {/* Complete button */}
        <button
          onClick={handleComplete}
          disabled={isPending || isCompleted}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
            isCompleted
              ? "border-green-500 bg-green-500 text-white"
              : "border-muted-foreground/30 hover:border-green-500"
          }`}
        >
          {isCompleted && <Check className="h-3 w-3" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
              {task.title}
            </span>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${prio.color}`}>
              {prio.label}
            </span>
            {isOverdue && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                Überfällig
              </Badge>
            )}
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
            {task.due_date && (
              <span className={`flex items-center gap-1 ${isOverdue ? "text-red-600 font-medium" : ""}`}>
                <Calendar className="h-3 w-3" />
                {new Date(task.due_date).toLocaleDateString("de-DE")}
              </span>
            )}
            {task.contacts && (
              <Link href={`/contacts/${task.contacts.id}`} className="flex items-center gap-1 hover:underline">
                <User className="h-3 w-3" />
                {task.contacts.first_name} {task.contacts.last_name}
              </Link>
            )}
            {task.companies && (
              <Link href={`/companies/${task.companies.id}`} className="flex items-center gap-1 hover:underline">
                <Building2 className="h-3 w-3" />
                {task.companies.name}
              </Link>
            )}
            {task.deals && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {task.deals.title}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-start gap-1 shrink-0">
          <TaskSheet
            contacts={contacts}
            companies={companies}
            deals={deals}
            task={task}
            trigger={
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            }
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
