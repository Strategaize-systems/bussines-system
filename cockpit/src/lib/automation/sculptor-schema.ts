// V7.5 SLC-752 MT-3 — Sculptor zod-Schemas (Single-Source-of-Truth-Bind).
//
// Spiegelt V6.2-Whitelists exakt:
//   - TriggerEvent: types/automation.ts (Single-Source)
//   - ActionType (User-subset): types/automation.ts UserActionType
//   - UPDATE_FIELD_WHITELIST: lib/automation/field-whitelist.ts (Single-Source)
//
// Wird vom Sculptor verwendet, um Bedrock-Output gegen die V6.2-Workflow-Engine
// zu validieren. Drift-Schutz: wenn types/automation.ts oder field-whitelist.ts
// erweitert werden, propagiert sich die Aenderung automatisch hierher.

import { z } from "zod";

import type {
  Action,
  ActionType,
  Condition,
  ConditionOp,
  TriggerConfig,
  TriggerEvent,
  UserActionType,
} from "@/types/automation";
import { UPDATE_FIELD_WHITELIST } from "./field-whitelist";

// ---------------------------------------------------------------------------
// Trigger-Event-Whitelist (V6.2 single-source)
// ---------------------------------------------------------------------------

export const TRIGGER_EVENTS: readonly TriggerEvent[] = [
  "deal.stage_changed",
  "deal.created",
  "activity.created",
] as const;

export const TriggerEventSchema = z.enum(TRIGGER_EVENTS as [TriggerEvent, ...TriggerEvent[]]);

// ---------------------------------------------------------------------------
// Action-Type-Whitelist (V6.2 User-subset — kein auto_winloss_extract)
// DEC-171 SLC-665: auto_winloss_extract ist System-only und darf NICHT durch
// User-NL-Sculptor erzeugt werden.
// ---------------------------------------------------------------------------

export const USER_ACTION_TYPES: readonly UserActionType[] = [
  "create_task",
  "send_email_template",
  "create_activity",
  "update_field",
] as const;

export const ActionTypeSchema = z.enum(USER_ACTION_TYPES as [UserActionType, ...UserActionType[]]);

// ---------------------------------------------------------------------------
// Condition-Op-Whitelist
// ---------------------------------------------------------------------------

export const CONDITION_OPS: readonly ConditionOp[] = [
  "eq",
  "neq",
  "gt",
  "lt",
  "gte",
  "lte",
  "in",
  "not_in",
  "contains",
] as const;

export const ConditionOpSchema = z.enum(CONDITION_OPS as [ConditionOp, ...ConditionOp[]]);

// ---------------------------------------------------------------------------
// Condition-Schema (frei in field — die Engine validiert Field-Whitelist
// gegen die jeweilige Quelle (deal/contact/...) zum Eval-Zeitpunkt; der
// Sculptor verlangt nur eine string-Field-Angabe).
// ---------------------------------------------------------------------------

export const ConditionSchema: z.ZodType<Condition> = z.object({
  field: z.string().min(1),
  op: ConditionOpSchema,
  value: z.unknown(),
});

// ---------------------------------------------------------------------------
// Trigger-Config-Sub-Schemas
// ---------------------------------------------------------------------------

const TriggerConfigStageChangedSchema = z
  .object({
    pipeline_id: z.string().uuid().optional(),
    stage_id: z.string().uuid().optional(),
  })
  .strict();

const TriggerConfigDealCreatedSchema = z
  .object({
    pipeline_id: z.string().uuid().optional(),
  })
  .strict();

const TriggerConfigActivityCreatedSchema = z
  .object({
    activity_types: z
      .array(z.enum(["call", "email", "meeting", "note", "task", "briefing"]))
      .min(1)
      .optional(),
  })
  .strict();

export const TriggerConfigSchema: z.ZodType<TriggerConfig> = z.union([
  TriggerConfigStageChangedSchema,
  TriggerConfigDealCreatedSchema,
  TriggerConfigActivityCreatedSchema,
  z.object({}).strict(),
]);

// ---------------------------------------------------------------------------
// Assignee-Source-Schema fuer create_task.
// ---------------------------------------------------------------------------

const AssigneeSourceSchema = z.union([
  z.literal("deal_owner"),
  z.literal("trigger_user"),
  z.object({ uuid: z.string().uuid() }).strict(),
]);

// ---------------------------------------------------------------------------
// Action-Param-Schemas (discriminated union via type)
// ---------------------------------------------------------------------------

const CreateTaskParamsSchema = z
  .object({
    title: z.string().min(1).max(200),
    due_in_days: z.number().int().min(0).max(365).optional(),
    assignee: AssigneeSourceSchema.optional(),
  })
  .strict();

const SendEmailTemplateParamsSchema = z
  .object({
    template_id: z.string().uuid(),
    mode: z.enum(["draft", "direct"]),
  })
  .strict();

const CreateActivityParamsSchema = z
  .object({
    type: z.enum(["note", "task", "call", "email", "meeting"]),
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
  })
  .strict();

/**
 * UpdateField verlangt Whitelist-Konsistenz. Wir akzeptieren hier nur Felder,
 * die in `UPDATE_FIELD_WHITELIST` stehen. Value bleibt z.unknown() — die
 * Field-spezifische Value-Validation laeuft im V6.2-Action-Executor
 * (validateFieldValue in field-whitelist.ts).
 */
const updateFieldWhitelistTuple = (() => {
  const items: Array<{ entity: "deal" | "contact" | "company"; field: string }> = [];
  for (const entity of Object.keys(UPDATE_FIELD_WHITELIST) as Array<"deal" | "contact" | "company">) {
    for (const spec of UPDATE_FIELD_WHITELIST[entity]) {
      items.push({ entity, field: spec.field });
    }
  }
  return items;
})();

const UpdateFieldParamsSchema = z
  .object({
    entity: z.enum(["deal", "contact", "company"]),
    field: z.string().min(1),
    value: z.unknown(),
  })
  .strict()
  .superRefine((val, ctx) => {
    const hit = updateFieldWhitelistTuple.find(
      (e) => e.entity === val.entity && e.field === val.field
    );
    if (!hit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Feld '${val.entity}.${val.field}' ist nicht in der update_field-Whitelist (siehe UPDATE_FIELD_WHITELIST).`,
        path: ["field"],
      });
    }
  });

/**
 * Action-Discriminated-Union — exakt UserActionType (kein auto_winloss_extract).
 */
export const ActionSchema: z.ZodType<Exclude<Action, { type: "auto_winloss_extract" }>> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("create_task"), params: CreateTaskParamsSchema }),
  z.object({ type: z.literal("send_email_template"), params: SendEmailTemplateParamsSchema }),
  z.object({ type: z.literal("create_activity"), params: CreateActivityParamsSchema }),
  z.object({ type: z.literal("update_field"), params: UpdateFieldParamsSchema }),
]);

// ---------------------------------------------------------------------------
// Sculpt-Success-Schema — die "Happy-Path"-Ausgabe des Sculptors.
// ---------------------------------------------------------------------------

export const SculptSuccessSchema = z
  .object({
    name: z.string().min(3).max(120),
    description: z.string().max(500).nullable().optional(),
    trigger_event: TriggerEventSchema,
    trigger_config: TriggerConfigSchema,
    conditions: z.array(ConditionSchema).max(10),
    actions: z.array(ActionSchema).min(1).max(5),
  })
  .strict();

export type SculptSuccess = z.infer<typeof SculptSuccessSchema>;

// ---------------------------------------------------------------------------
// Sculpt-Reject-Schema — wenn die NL-Eingabe ausserhalb der Workflow-Domain ist.
// ---------------------------------------------------------------------------

export const SculptRejectSchema = z
  .object({
    reject_reason: z.literal("out_of_domain"),
    explanation: z.string().min(5).max(500),
  })
  .strict();

export type SculptReject = z.infer<typeof SculptRejectSchema>;

// ---------------------------------------------------------------------------
// Convenience: type-safe Parser, der success/reject/unknown unterscheidet.
// ---------------------------------------------------------------------------

export type SculptParsed =
  | { kind: "success"; data: SculptSuccess }
  | { kind: "reject"; data: SculptReject }
  | { kind: "invalid"; successErrors: string; rejectErrors: string };

export function parseSculptOutput(raw: unknown): SculptParsed {
  const success = SculptSuccessSchema.safeParse(raw);
  if (success.success) return { kind: "success", data: success.data };
  const reject = SculptRejectSchema.safeParse(raw);
  if (reject.success) return { kind: "reject", data: reject.data };
  return {
    kind: "invalid",
    successErrors: success.error.message,
    rejectErrors: reject.error.message,
  };
}

// Re-Exports fuer Konsumenten, die den ActionType-Subset brauchen.
export type { ActionType, UserActionType };
