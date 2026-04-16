export type MeetingAgendaMode = "auto" | "on_click" | "off";

export type PushSubscriptionJson = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type UserSettings = {
  user_id: string;
  meeting_reminder_external_hours: number[];
  meeting_reminder_internal_enabled: boolean;
  meeting_reminder_internal_minutes: number;
  meeting_agenda_mode: MeetingAgendaMode;
  push_subscription: PushSubscriptionJson | null;
  created_at: string;
  updated_at: string;
};
