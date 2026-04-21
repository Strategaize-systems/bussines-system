// =============================================================
// Email Tracking Types — Open/Click Tracking (FEAT-506, V5)
// =============================================================

export type TrackingEventType = "open" | "click";

export interface EmailTrackingEvent {
  id: string;
  tracking_id: string;
  email_id: string;
  event_type: TrackingEventType;
  link_url: string | null;
  link_index: number | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface TrackingSummary {
  open_count: number;
  click_count: number;
  first_opened_at: string | null;
  last_opened_at: string | null;
  clicked_links: { url: string; count: number }[];
}
