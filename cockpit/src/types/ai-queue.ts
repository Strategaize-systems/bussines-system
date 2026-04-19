// =============================================================
// AI Action Queue Types — Human-in-the-Loop
// (FEAT-407, FEAT-408, FEAT-402, FEAT-412)
// =============================================================

/** Action type for ai_action_queue entries */
export type AIActionType =
  | "reply"
  | "followup"
  | "meeting"
  | "assign_contact"
  | "reclassify"
  | "task"
  | "info"
  // V4.3 Insight Governance — property change suggestions
  | "property_change"
  | "status_change"
  | "tag_change"
  | "value_change";

/** Source that generated the action suggestion */
export type AIActionSource =
  | "gatekeeper"
  | "followup_engine"
  | "auto_reply_detector"
  // V4.3 Signal-Extraktion sources
  | "signal_meeting"
  | "signal_email"
  | "signal_manual";

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

/** Target entity types for insight suggestions (V4.3) */
export type AITargetEntityType = "deal" | "contact";

/** Proposed change structure for insight suggestions (V4.3) */
export interface ProposedChange {
  field: string;
  old?: string | number | null;
  new: string | number;
  action?: "add" | "remove";
  currency?: string;
  tag?: string;
}

/** Signal type for structured signal extraction (V4.3) */
export type SignalType =
  | "stage_suggestion"
  | "value_update"
  | "tag_addition"
  | "priority_change";

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
  // V4.3 Insight Governance — nullable, only for signal-based entries
  target_entity_type: AITargetEntityType | null;
  target_entity_id: string | null;
  proposed_changes: ProposedChange | null;
  confidence: number | null;
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
