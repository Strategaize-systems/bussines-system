// V6.2 SLC-623 — Field-Picker Optionen + Op-Picker je nach Datentyp.
//
// Wird sowohl von step-conditions.tsx als auch update-field-form.tsx verwendet.
// Whitelist fuer update_field kommt aus field-whitelist.ts (single source).

import type { ConditionOp } from "@/types/automation";

export type EntityScope = "deal" | "contact" | "company" | "activity";

export interface FieldOption {
  field: string;
  label: string;
  type: "string" | "number" | "uuid" | "date" | "array";
  description?: string;
}

export const CONDITION_FIELDS: Record<EntityScope, FieldOption[]> = {
  deal: [
    {
      field: "stage_id",
      label: "Stage (UUID)",
      type: "uuid",
      description: "ID der aktuellen Pipeline-Stage",
    },
    {
      field: "pipeline_id",
      label: "Pipeline (UUID)",
      type: "uuid",
    },
    {
      field: "value",
      label: "Deal-Wert",
      type: "number",
      description: "Numerischer Wert in Euro",
    },
    {
      field: "status",
      label: "Status (active/won/lost/...)",
      type: "string",
    },
    {
      field: "title",
      label: "Titel",
      type: "string",
    },
    {
      field: "tags",
      label: "Tags (Liste)",
      type: "array",
    },
  ],
  contact: [
    { field: "tags", label: "Tags", type: "array" },
  ],
  company: [
    { field: "tags", label: "Tags", type: "array" },
  ],
  activity: [
    {
      field: "type",
      label: "Activity-Typ (call/email/meeting/note/task)",
      type: "string",
    },
    {
      field: "title",
      label: "Titel",
      type: "string",
    },
  ],
};

export const OPS_BY_TYPE: Record<FieldOption["type"], ConditionOp[]> = {
  string: ["eq", "neq", "in", "not_in", "contains"],
  number: ["eq", "neq", "gt", "lt", "gte", "lte"],
  uuid: ["eq", "neq", "in", "not_in"],
  date: ["eq", "neq", "gt", "lt", "gte", "lte"],
  array: ["contains"],
};

export const OP_LABELS: Record<ConditionOp, string> = {
  eq: "ist gleich",
  neq: "ist nicht",
  gt: "groesser als",
  lt: "kleiner als",
  gte: "groesser oder gleich",
  lte: "kleiner oder gleich",
  in: "ist einer von",
  not_in: "ist keiner von",
  contains: "enthaelt",
};

/** Whitelist-Felder fuer update_field (Spiegel von field-whitelist.ts). */
export const UPDATE_FIELD_OPTIONS: Record<
  "deal" | "contact" | "company",
  FieldOption[]
> = {
  deal: [
    { field: "stage_id", label: "Stage (UUID)", type: "uuid" },
    { field: "value", label: "Deal-Wert (>= 0)", type: "number" },
    {
      field: "expected_close_date",
      label: "Erwartetes Abschluss-Datum",
      type: "date",
    },
  ],
  contact: [
    { field: "tags", label: "Tags", type: "array" },
  ],
  company: [
    { field: "tags", label: "Tags", type: "array" },
  ],
};
