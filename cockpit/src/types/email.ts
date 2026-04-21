// =============================================================
// Email Types — IMAP sync, threads, messages (FEAT-405)
// =============================================================

/** Inbound email message from IMAP sync */
export interface EmailMessage {
  id: string;
  message_id: string;
  in_reply_to: string | null;
  references_header: string | null;
  thread_id: string | null;
  from_address: string;
  from_name: string | null;
  to_addresses: string[];
  cc_addresses: string[] | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  received_at: string;
  contact_id: string | null;
  company_id: string | null;
  deal_id: string | null;
  classification: EmailClassification;
  priority: EmailPriority;
  gatekeeper_summary: string | null;
  is_auto_reply: boolean;
  is_read: boolean;
  analyzed_at: string | null;
  attachments: EmailAttachment[];
  synced_at: string;
  retention_expires_at: string | null;
  headers_json: Record<string, unknown> | null;
  created_by: string | null;
  // V5: Auto-Zuordnung (FEAT-505)
  assignment_source: AssignmentSource | null;
  ai_match_confidence: number | null;
}

/** How an inbound email was assigned to a contact (V5, FEAT-505) */
export type AssignmentSource = "exact_match" | "domain_match" | "ki_match" | "manual";

export type EmailClassification =
  | "unclassified"
  | "anfrage"
  | "antwort"
  | "auto_reply"
  | "newsletter"
  | "intern"
  | "spam";

export type EmailPriority =
  | "dringend"
  | "normal"
  | "niedrig"
  | "irrelevant";

export interface EmailAttachment {
  filename: string;
  mime_type: string;
  size_bytes: number;
}

/** Email thread grouping related messages */
export interface EmailThread {
  id: string;
  subject: string;
  first_message_at: string;
  last_message_at: string;
  message_count: number;
  contact_id: string | null;
  company_id: string | null;
  deal_id: string | null;
  created_at: string;
}

/** IMAP sync state tracking per folder */
export interface EmailSyncState {
  id: string;
  folder: string;
  last_uid: number;
  last_sync_at: string | null;
  status: "idle" | "syncing" | "error";
  error_message: string | null;
  emails_synced_total: number;
  created_at: string;
  updated_at: string;
}

/** Email message with joined relations (for UI display) */
export interface EmailMessageWithRelations extends EmailMessage {
  contact?: { id: string; first_name: string; last_name: string; email: string } | null;
  company?: { id: string; name: string } | null;
  deal?: { id: string; title: string; stage?: string } | null;
  thread?: EmailThread | null;
}

/** Calendar event source (extended for V4) */
export type CalendarEventSource = "manual" | "calcom" | "google" | "outlook";

export type CalendarSyncStatus = "synced" | "pending_sync" | "conflict";
