"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeTask, reopenTask } from "@/app/(app)/aufgaben/actions";
import type { Task } from "@/app/(app)/aufgaben/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, RotateCcw, Calendar } from "lucide-react";

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-slate-100 text-slate-600",
};

interface DealTasksProps {
  tasks: Task[];
  dealId: string;
}

export function DealTasks({ tasks }: DealTasksProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const openTasks = tasks.filter((t) => t.status !== "completed");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  const handleToggle = (task: Task) => {
    startTransition(async () => {
      if (task.status === "completed") {
        await reopenTask(task.id);
      } else {
        await completeTask(task.id);
      }
      router.refresh();
    });
  };

  if (tasks.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-8 text-center">
        Keine Aufgaben für diesen Deal.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {openTasks.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#4454b8] mb-2">
            Offen ({openTasks.length})
          </p>
          {openTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={handleToggle}
              isPending={isPending}
            />
          ))}
        </div>
      )}
      {completedTasks.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Erledigt ({completedTasks.length})
          </p>
          {completedTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={handleToggle}
              isPending={isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  isPending,
}: {
  task: Task;
  onToggle: (task: Task) => void;
  isPending: boolean;
}) {
  const isCompleted = task.status === "completed";
  return (
    <div
      className={`flex items-center gap-3 py-2 px-3 rounded-lg border border-slate-100 ${
        isCompleted ? "opacity-60" : ""
      }`}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        disabled={isPending}
        onClick={() => onToggle(task)}
      >
        {isCompleted ? (
          <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
        ) : (
          <Check className="h-3.5 w-3.5 text-green-600" />
        )}
      </Button>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${
            isCompleted
              ? "line-through text-slate-400"
              : "text-slate-700"
          }`}
        >
          {task.title}
        </p>
        {task.due_date && (
          <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-400">
            <Calendar className="h-3 w-3" />
            {new Date(task.due_date).toLocaleDateString("de-DE")}
          </div>
        )}
      </div>
      <Badge
        variant="secondary"
        className={`text-[10px] ${priorityColors[task.priority] || ""}`}
      >
        {task.priority}
      </Badge>
    </div>
  );
}
