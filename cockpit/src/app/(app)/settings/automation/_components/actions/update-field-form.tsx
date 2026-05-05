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
import type { UpdateFieldParams } from "@/types/automation";
import { UPDATE_FIELD_OPTIONS } from "../field-options";
import { ShieldCheck } from "lucide-react";

const ENTITIES: UpdateFieldParams["entity"][] = ["deal", "contact", "company"];

export function UpdateFieldForm({
  params,
  onChange,
}: {
  params: UpdateFieldParams;
  onChange: (p: UpdateFieldParams) => void;
}) {
  const entity = params.entity ?? "deal";
  const fieldOptions = UPDATE_FIELD_OPTIONS[entity];
  const currentField = fieldOptions.find((f) => f.field === params.field);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-md bg-emerald-50 p-2 text-xs text-emerald-800">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          PII-Schutz: Nur die gelisteten Felder sind editierbar. Felder wie
          E-Mail, Telefon, Name sind absichtlich nicht erlaubt.
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Entity</Label>
          <Select
            value={entity}
            onValueChange={(v) =>
              onChange({
                ...params,
                entity: (v ?? "deal") as UpdateFieldParams["entity"],
                field: "",
                value: "",
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENTITIES.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Feld</Label>
          <Select
            value={params.field ?? ""}
            onValueChange={(v) =>
              onChange({ ...params, field: v ?? "", value: "" })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Feld waehlen..." />
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
        <div>
          <Label className="text-xs">Wert</Label>
          <Input
            type={currentField?.type === "number" ? "number" : "text"}
            value={
              params.value === null || params.value === undefined
                ? ""
                : String(params.value)
            }
            onChange={(e) => {
              const raw = e.target.value;
              if (currentField?.type === "number") {
                onChange({
                  ...params,
                  value: raw === "" ? null : Number(raw),
                });
              } else if (currentField?.type === "array") {
                // CSV
                onChange({
                  ...params,
                  value: raw
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                });
              } else {
                onChange({ ...params, value: raw });
              }
            }}
            placeholder={
              currentField?.type === "uuid"
                ? "00000000-..."
                : currentField?.type === "array"
                  ? "Tag1, Tag2"
                  : ""
            }
          />
        </div>
      </div>
    </div>
  );
}
