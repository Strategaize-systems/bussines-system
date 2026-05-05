"use client";

import {
  Plus,
  X,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Mail,
  StickyNote,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Action, ActionType } from "@/types/automation";
import { CreateTaskForm } from "./actions/create-task-form";
import { CreateActivityForm } from "./actions/create-activity-form";
import { UpdateFieldForm } from "./actions/update-field-form";
import {
  SendEmailTemplateForm,
  type EmailTemplateOption,
} from "./actions/send-email-template-form";

const ACTION_DEFAULTS: Record<ActionType, Action> = {
  create_task: {
    type: "create_task",
    params: { title: "" },
  },
  send_email_template: {
    type: "send_email_template",
    params: { template_id: "", mode: "draft" },
  },
  create_activity: {
    type: "create_activity",
    params: { type: "note", title: "" },
  },
  update_field: {
    type: "update_field",
    params: { entity: "deal", field: "stage_id", value: "" },
  },
};

const ACTION_META: Record<
  ActionType,
  { label: string; Icon: typeof CheckSquare; bg: string; text: string }
> = {
  create_task: {
    label: "Aufgabe anlegen",
    Icon: CheckSquare,
    bg: "bg-sky-50",
    text: "text-sky-700",
  },
  send_email_template: {
    label: "E-Mail-Template",
    Icon: Mail,
    bg: "bg-violet-50",
    text: "text-violet-700",
  },
  create_activity: {
    label: "Activity anlegen",
    Icon: StickyNote,
    bg: "bg-amber-50",
    text: "text-amber-700",
  },
  update_field: {
    label: "Feld aendern",
    Icon: Edit3,
    bg: "bg-emerald-50",
    text: "text-emerald-700",
  },
};

export function StepActions({
  actions,
  emailTemplates,
  onChange,
}: {
  actions: Action[];
  emailTemplates: EmailTemplateOption[];
  onChange: (a: Action[]) => void;
}) {
  function addAction(type: ActionType) {
    onChange([...actions, ACTION_DEFAULTS[type]]);
  }
  function removeAction(idx: number) {
    onChange(actions.filter((_, i) => i !== idx));
  }
  function updateAction(idx: number, patch: Action) {
    onChange(actions.map((a, i) => (i === idx ? patch : a)));
  }
  function moveAction(idx: number, dir: "up" | "down") {
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= actions.length) return;
    const next = [...actions];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-medium text-slate-900">
          Was soll passieren?
        </h3>
        <p className="text-sm text-slate-500">
          Mindestens eine Aktion. Aktionen werden in der hier festgelegten
          Reihenfolge ausgefuehrt; eine fehlgeschlagene Aktion stoppt nicht
          die naechsten.
        </p>
      </div>

      <div className="space-y-3">
        {actions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
            Noch keine Aktionen.
          </div>
        ) : null}
        {actions.map((action, i) => {
          const meta = ACTION_META[action.type];
          const Icon = meta.Icon;
          return (
            <div
              key={i}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-md ${meta.bg}`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${meta.text}`} />
                  </div>
                  <span className="text-sm font-medium text-slate-900">
                    Schritt {i + 1}: {meta.label}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveAction(i, "up")}
                    disabled={i === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveAction(i, "down")}
                    disabled={i === actions.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAction(i)}
                    className="text-rose-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {action.type === "create_task" ? (
                <CreateTaskForm
                  params={action.params}
                  onChange={(p) =>
                    updateAction(i, { type: "create_task", params: p })
                  }
                />
              ) : null}
              {action.type === "send_email_template" ? (
                <SendEmailTemplateForm
                  params={action.params}
                  templates={emailTemplates}
                  onChange={(p) =>
                    updateAction(i, {
                      type: "send_email_template",
                      params: p,
                    })
                  }
                />
              ) : null}
              {action.type === "create_activity" ? (
                <CreateActivityForm
                  params={action.params}
                  onChange={(p) =>
                    updateAction(i, { type: "create_activity", params: p })
                  }
                />
              ) : null}
              {action.type === "update_field" ? (
                <UpdateFieldForm
                  params={action.params}
                  onChange={(p) =>
                    updateAction(i, { type: "update_field", params: p })
                  }
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(ACTION_META) as ActionType[]).map((t) => {
          const meta = ACTION_META[t];
          const Icon = meta.Icon;
          return (
            <Button
              key={t}
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => addAction(t)}
            >
              <Plus className="h-3.5 w-3.5" />
              <Icon className={`h-3.5 w-3.5 ${meta.text}`} />
              {meta.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
