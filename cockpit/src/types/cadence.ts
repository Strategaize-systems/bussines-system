// =============================================================
// Cadence Types — Follow-up Sequences (FEAT-501, V5)
// =============================================================

export type CadenceStatus = "active" | "paused" | "archived";

export type CadenceStepType = "email" | "task" | "wait";

export type EnrollmentStatus = "active" | "completed" | "stopped" | "paused";

export type EnrollmentStopReason =
  | "reply_received"
  | "deal_won"
  | "deal_lost"
  | "manual"
  | "cadence_paused";

export type ExecutionStatus = "executed" | "skipped" | "failed";

export interface Cadence {
  id: string;
  name: string;
  description: string | null;
  status: CadenceStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CadenceWithSteps extends Cadence {
  steps: CadenceStep[];
  enrollment_count?: number;
}

export interface CadenceStep {
  id: string;
  cadence_id: string;
  step_order: number;
  step_type: CadenceStepType;
  delay_days: number;
  email_template_id: string | null;
  email_subject: string | null;
  email_body: string | null;
  task_title: string | null;
  task_description: string | null;
  created_at: string;
}

export interface CadenceEnrollment {
  id: string;
  cadence_id: string;
  deal_id: string | null;
  contact_id: string | null;
  status: EnrollmentStatus;
  current_step_order: number;
  next_execute_at: string;
  started_at: string;
  completed_at: string | null;
  stopped_at: string | null;
  stop_reason: EnrollmentStopReason | null;
  created_by: string | null;
  created_at: string;
}

export interface CadenceEnrollmentWithContext extends CadenceEnrollment {
  cadence?: Cadence | null;
  deal?: { id: string; name: string; status: string } | null;
  contact?: { id: string; first_name: string; last_name: string; email: string | null } | null;
  current_step?: CadenceStep | null;
}

export interface CadenceExecution {
  id: string;
  enrollment_id: string;
  step_id: string;
  step_order: number;
  step_type: CadenceStepType;
  status: ExecutionStatus;
  result_detail: string | null;
  email_id: string | null;
  task_id: string | null;
  executed_at: string;
}
