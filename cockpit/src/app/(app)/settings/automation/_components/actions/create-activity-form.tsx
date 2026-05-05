"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CreateActivityParams } from "@/types/automation";

const TYPES: CreateActivityParams["type"][] = [
  "note",
  "task",
  "call",
  "email",
  "meeting",
];

export function CreateActivityForm({
  params,
  onChange,
}: {
  params: CreateActivityParams;
  onChange: (p: CreateActivityParams) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Typ</Label>
          <Select
            value={params.type ?? "note"}
            onValueChange={(v) =>
              onChange({ ...params, type: v as CreateActivityParams["type"] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Titel</Label>
          <Input
            value={params.title ?? ""}
            onChange={(e) => onChange({ ...params, title: e.target.value })}
            placeholder="z.B. Internal Note: Stage Change zu {{deal.title}}"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Beschreibung (optional)</Label>
        <Textarea
          rows={2}
          value={params.description ?? ""}
          onChange={(e) =>
            onChange({ ...params, description: e.target.value || undefined })
          }
          placeholder="Variablen: {{deal.title}}, {{deal.value}}, {{rule.name}}"
        />
      </div>
    </div>
  );
}
