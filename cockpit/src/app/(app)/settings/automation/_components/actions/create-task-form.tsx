"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CreateTaskParams, AssigneeSource } from "@/types/automation";

export function CreateTaskForm({
  params,
  onChange,
}: {
  params: CreateTaskParams;
  onChange: (p: CreateTaskParams) => void;
}) {
  const assigneeKey =
    typeof params.assignee === "object" && params.assignee !== null
      ? "uuid"
      : ((params.assignee as string | undefined) ?? "deal_owner");

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Titel der Aufgabe</Label>
        <Input
          value={params.title ?? ""}
          onChange={(e) => onChange({ ...params, title: e.target.value })}
          placeholder="z.B. Follow-up zu Deal {{deal.title}}"
        />
        <p className="mt-1 text-xs text-slate-500">
          Variablen: <code>{"{{deal.title}}"}</code>,{" "}
          <code>{"{{deal.value}}"}</code>, <code>{"{{rule.name}}"}</code>
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Faellig in (Tagen)</Label>
          <Input
            type="number"
            min={0}
            value={params.due_in_days ?? ""}
            onChange={(e) =>
              onChange({
                ...params,
                due_in_days: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
            placeholder="0 = heute, leer = ohne Datum"
          />
        </div>
        <div>
          <Label className="text-xs">Zustaendig</Label>
          <Select
            value={assigneeKey}
            onValueChange={(v) => {
              if (v === "deal_owner" || v === "trigger_user") {
                onChange({ ...params, assignee: v as AssigneeSource });
              } else {
                onChange({ ...params, assignee: { uuid: "" } });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deal_owner">Deal-Besitzer</SelectItem>
              <SelectItem value="trigger_user">
                Ausloesender User
              </SelectItem>
              <SelectItem value="uuid">Fixe Person (UUID)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {assigneeKey === "uuid" ? (
        <div>
          <Label className="text-xs">User-UUID</Label>
          <Input
            value={
              typeof params.assignee === "object" && params.assignee !== null
                ? params.assignee.uuid
                : ""
            }
            onChange={(e) =>
              onChange({ ...params, assignee: { uuid: e.target.value } })
            }
            placeholder="00000000-0000-0000-0000-000000000000"
          />
        </div>
      ) : null}
    </div>
  );
}
