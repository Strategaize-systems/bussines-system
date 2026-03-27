"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  StickyNote,
  Phone,
  Mail,
  Users,
  CheckSquare,
  ArrowRightLeft,
  Check,
  Trash2,
} from "lucide-react";
import { completeActivity, deleteActivity } from "@/lib/actions/activity-actions";
import type { Activity } from "@/lib/actions/activity-actions";

const TYPE_CONFIG: Record<string, { icon: typeof StickyNote; label: string; color: string }> = {
  note: { icon: StickyNote, label: "Notiz", color: "text-blue-500" },
  call: { icon: Phone, label: "Anruf", color: "text-green-500" },
  email: { icon: Mail, label: "E-Mail", color: "text-purple-500" },
  meeting: { icon: Users, label: "Meeting", color: "text-orange-500" },
  task: { icon: CheckSquare, label: "Aufgabe", color: "text-yellow-500" },
  stage_change: { icon: ArrowRightLeft, label: "Stage-Wechsel", color: "text-muted-foreground" },
};

export function ActivityItem({ activity }: { activity: Activity }) {
  const [isPending, startTransition] = useTransition();
  const config = TYPE_CONFIG[activity.type] || TYPE_CONFIG.note;
  const Icon = config.icon;

  const isCompleted = !!activity.completed_at;
  const isTask = activity.type === "task";

  const handleComplete = () => {
    startTransition(async () => {
      await completeActivity(activity.id);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteActivity(activity.id);
    });
  };

  return (
    <div className="flex gap-3 py-2">
      {/* Icon */}
      <div className={`mt-0.5 ${config.color}`}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {config.label}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(activity.created_at).toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {isCompleted && (
            <span className="text-xs text-green-600">erledigt</span>
          )}
        </div>
        {activity.title && (
          <p className="text-sm font-medium leading-tight">{activity.title}</p>
        )}
        {activity.description && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {activity.description}
          </p>
        )}
        {activity.due_date && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Fällig: {new Date(activity.due_date).toLocaleDateString("de-DE")}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-start gap-1 shrink-0">
        {isTask && !isCompleted && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleComplete}
            disabled={isPending}
            title="Als erledigt markieren"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
        {activity.type !== "stage_change" && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleDelete}
            disabled={isPending}
            title="Löschen"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}
