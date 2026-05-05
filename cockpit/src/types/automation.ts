// V6.2 SLC-621 — Workflow-Automation Types
//
// Single Source of Truth fuer alle Automation-Engine-Datenstrukturen.
// Spiegelt MIG-029 Workflow-Anteil (automation_rules + automation_runs).

export type TriggerEvent =
  | "deal.stage_changed"
  | "deal.created"
  | "activity.created";

export type RuleStatus = "active" | "paused" | "disabled";

export type RunStatus =
  | "pending"
  | "running"
  | "success"
  | "partial_failed"
  | "failed"
  | "skipped";

export type ActionType =
  | "create_task"
  | "send_email_template"
  | "create_activity"
  | "update_field";

export type ConditionOp =
  | "eq"
  | "neq"
  | "gt"
  | "lt"
  | "gte"
  | "lte"
  | "in"
  | "not_in"
  | "contains";

export type ActionOutcome = "success" | "failed" | "skipped";

export interface Condition {
  field: string;
  op: ConditionOp;
  value: unknown;
}

// trigger_config-JSONB Sub-Shapes
export interface TriggerConfigStageChanged {
  pipeline_id?: string;
  stage_id?: string;
}

export interface TriggerConfigDealCreated {
  pipeline_id?: string;
}

export interface TriggerConfigActivityCreated {
  activity_types?: string[]; // call|email|meeting|note|task|briefing
}

export type TriggerConfig =
  | TriggerConfigStageChanged
  | TriggerConfigDealCreated
  | TriggerConfigActivityCreated
  | Record<string, never>;

// Action-Discriminated-Union
export type AssigneeSource =
  | "deal_owner"
  | "trigger_user"
  | { uuid: string };

export interface CreateTaskParams {
  title: string;
  due_in_days?: number; // 0|1|3|7|...
  assignee?: AssigneeSource;
}

export interface SendEmailTemplateParams {
  template_id: string;
  mode: "draft" | "direct";
}

export interface CreateActivityParams {
  type: "note" | "task" | "call" | "email" | "meeting";
  title: string;
  description?: string;
}

export interface UpdateFieldParams {
  entity: "deal" | "contact" | "company";
  field: string;
  value: unknown;
}

export type Action =
  | { type: "create_task"; params: CreateTaskParams }
  | { type: "send_email_template"; params: SendEmailTemplateParams }
  | { type: "create_activity"; params: CreateActivityParams }
  | { type: "update_field"; params: UpdateFieldParams };

// DB-Row-Shapes
export interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  status: RuleStatus;
  trigger_event: TriggerEvent;
  trigger_config: TriggerConfig;
  conditions: Condition[];
  actions: Action[];
  references_stage_ids: string[];
  paused_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_run_at: string | null;
  last_run_status: RunStatus | null;
}

export interface ActionResult {
  action_index: number;
  type: ActionType;
  outcome: ActionOutcome;
  error_message?: string;
  audit_log_id?: string;
}

export interface AutomationRun {
  id: string;
  rule_id: string;
  trigger_event: TriggerEvent;
  trigger_entity_type: "deal" | "activity";
  trigger_entity_id: string;
  trigger_event_audit_id: string | null;
  conditions_match: boolean | null;
  status: RunStatus;
  started_at: string;
  finished_at: string | null;
  action_results: ActionResult[];
  error_message: string | null;
  created_at: string;
}

// Save-Input fuer Server Actions
export interface SaveAutomationRuleInput {
  id?: string;
  name: string;
  description?: string | null;
  status: RuleStatus;
  trigger_event: TriggerEvent;
  trigger_config: TriggerConfig;
  conditions: Condition[];
  actions: Action[];
}

// List-Result mit JOIN auf last automation_run
export interface AutomationRuleListItem extends AutomationRule {
  run_count_7d?: number;
  success_count_7d?: number;
}
