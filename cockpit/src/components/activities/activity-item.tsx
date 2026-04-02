"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  StickyNote,
  Phone,
  Mail,
  Users,
  CheckSquare,
  ArrowRightLeft,
  Check,
  Trash2,
  AlertTriangle,
  Lightbulb,
  ShieldAlert,
  ArrowRight,
  Zap,
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
  const hasConversationData = !!(
    activity.summary ||
    activity.objections ||
    activity.opportunities ||
    activity.risks ||
    activity.next_steps ||
    activity.qualification_signals
  );

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
        {hasConversationData && (
          <div className="mt-2 space-y-1.5 rounded-md bg-muted/50 p-2 text-xs">
            {activity.conversation_type && (
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px]">{activity.conversation_type}</Badge>
                {activity.participants && (
                  <span className="text-muted-foreground">mit {activity.participants}</span>
                )}
              </div>
            )}
            {activity.summary && (
              <p className="text-sm leading-snug">{activity.summary}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              {activity.objections && (
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  {activity.objections}
                </span>
              )}
              {activity.opportunities && (
                <span className="flex items-center gap-1">
                  <Lightbulb className="h-3 w-3 text-green-500" />
                  {activity.opportunities}
                </span>
              )}
              {activity.risks && (
                <span className="flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3 text-yellow-500" />
                  {activity.risks}
                </span>
              )}
              {activity.next_steps && (
                <span className="flex items-center gap-1">
                  <ArrowRight className="h-3 w-3 text-blue-500" />
                  {activity.next_steps}
                </span>
              )}
            </div>
            {activity.qualification_signals && (
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-purple-500" />
                <span className="text-purple-700">{activity.qualification_signals}</span>
              </div>
            )}
          </div>
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
