// =============================================================
// AI Action Queue Types — Human-in-the-Loop (FEAT-407, FEAT-408)
// =============================================================

/** Action type for ai_action_queue entries */
export type AIActionType =
  | "reply"
  | "followup"
  | "meeting"
  | "assign_contact"
  | "reclassify"
  | "task"
  | "info";

/** Source that generated the action suggestion */
export type AIActionSource =
  | "gatekeeper"
  | "followup_engine"
  | "auto_reply_detector";

/** Status workflow for action queue entries */
export type AIActionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "executed"
  | "expired";

/** Entity types that actions can reference */
export type AIActionEntityType =
  | "email_message"
  | "deal"
  | "contact"
  | "company";

/** AI action queue entry — a suggestion waiting for human decision */
export interface AIActionQueueItem {
  id: string;
  type: AIActionType;
  action_description: string;
  reasoning: string | null;
  entity_type: AIActionEntityType;
  entity_id: string;
  context_json: Record<string, unknown> | null;
  priority: "dringend" | "normal" | "niedrig";
  source: AIActionSource;
  status: AIActionStatus;
  suggested_at: string;
  decided_at: string | null;
  decided_by: string | null;
  execution_result: string | null;
  dedup_key: string | null;
  expires_at: string | null;
  created_at: string;
}

/** Feedback on a rejected or modified action (for learning) */
export interface AIFeedback {
  id: string;
  action_queue_id: string;
  feedback_type: "approved" | "rejected" | "modified";
  reason: string | null;
  created_at: string;
}

/** AI action queue item with display-friendly joined data */
export interface AIActionQueueItemWithContext extends AIActionQueueItem {
  /** Related entity display info */
  entity_display?: {
    title: string;
    subtitle?: string;
    link?: string;
  };
}
