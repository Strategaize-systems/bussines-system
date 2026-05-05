"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Condition, TriggerEvent } from "@/types/automation";
import {
  CONDITION_FIELDS,
  OP_LABELS,
  OPS_BY_TYPE,
  type EntityScope,
  type FieldOption,
} from "./field-options";

function entityScopeForTrigger(trigger: TriggerEvent): EntityScope {
  if (trigger === "activity.created") return "activity";
  return "deal";
}

export function StepConditions({
  triggerEvent,
  conditions,
  onChange,
}: {
  triggerEvent: TriggerEvent;
  conditions: Condition[];
  onChange: (c: Condition[]) => void;
}) {
  const scope = entityScopeForTrigger(triggerEvent);
  const fieldOptions = CONDITION_FIELDS[scope] ?? [];

  function addRow() {
    const f = fieldOptions[0];
    if (!f) return;
    onChange([
      ...conditions,
      { field: f.field, op: OPS_BY_TYPE[f.type][0], value: "" },
    ]);
  }
  function removeRow(idx: number) {
    onChange(conditions.filter((_, i) => i !== idx));
  }
  function updateRow(idx: number, patch: Partial<Condition>) {
    onChange(
      conditions.map((c, i) => (i === idx ? { ...c, ...patch } : c))
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-medium text-slate-900">
          Welche Bedingungen muessen erfuellt sein?
        </h3>
        <p className="text-sm text-slate-500">
          Alle Bedingungen werden mit UND verknuepft. Leer = keine zusaetzliche
          Filterung.
        </p>
      </div>

      <div className="space-y-2">
        {conditions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
            Keine Bedingungen — Regel triggert immer wenn das Trigger-Event
            ausgeloest wird.
          </div>
        ) : null}
        {conditions.map((c, i) => {
          const fieldOpt =
            fieldOptions.find((f) => f.field === c.field) ?? fieldOptions[0];
          const ops = fieldOpt ? OPS_BY_TYPE[fieldOpt.type] : [];
          return (
            <div
              key={i}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <div className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-4">
                  <Label className="text-xs">Feld</Label>
                  <Select
                    value={c.field}
                    onValueChange={(v) => {
                      const fld = v ?? "";
                      const nf = fieldOptions.find((f) => f.field === fld);
                      const newOp = nf ? OPS_BY_TYPE[nf.type][0] : c.op;
                      updateRow(i, { field: fld, op: newOp, value: "" });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldOptions.map((f) => (
                        <SelectItem key={f.field} value={f.field}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Operator</Label>
                  <Select
                    value={c.op}
                    onValueChange={(v) =>
                      updateRow(i, { op: (v ?? c.op) as Condition["op"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ops.map((op) => (
                        <SelectItem key={op} value={op}>
                          {OP_LABELS[op]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-4">
                  <Label className="text-xs">Wert</Label>
                  <Input
                    type={fieldOpt?.type === "number" ? "number" : "text"}
                    value={
                      Array.isArray(c.value)
                        ? c.value.join(", ")
                        : c.value === null || c.value === undefined
                          ? ""
                          : String(c.value)
                    }
                    onChange={(e) =>
                      updateRow(i, {
                        value: parseValue(e.target.value, fieldOpt),
                      })
                    }
                    placeholder={
                      fieldOpt?.type === "uuid"
                        ? "00000000-..."
                        : fieldOpt?.type === "array"
                          ? "Tag1, Tag2"
                          : ""
                    }
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(i)}
                    className="text-rose-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Button variant="outline" onClick={addRow} className="gap-2">
        <Plus className="h-4 w-4" />
        Bedingung hinzufuegen
      </Button>
    </div>
  );
}

function parseValue(raw: string, field?: FieldOption): unknown {
  if (raw === "") return "";
  if (!field) return raw;
  if (field.type === "number") {
    const n = Number(raw);
    return Number.isNaN(n) ? raw : n;
  }
  if (field.type === "array") {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return raw;
}
