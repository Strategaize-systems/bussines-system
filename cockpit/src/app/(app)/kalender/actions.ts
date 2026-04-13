"use server";

import { createClient } from "@/lib/supabase/server";

export type CalendarEventRow = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  type: string;
  description: string | null;
  location: string | null;
  deal_id: string | null;
  contact_id: string | null;
  company_id: string | null;
  meeting_id: string | null;
  source: string | null;
  created_by: string | null;
  created_at: string;
  contacts?: { id: string; first_name: string; last_name: string } | null;
  companies?: { id: string; name: string } | null;
  deals?: { id: string; title: string } | null;
};

export async function getCalendarEventsForRange(
  startISO: string,
  endISO: string
): Promise<CalendarEventRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("calendar_events")
    .select(
      "*, contacts(id, first_name, last_name), companies(id, name), deals(id, title)"
    )
    .gte("start_time", startISO)
    .lt("start_time", endISO)
    .order("start_time", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CalendarEventRow[];
}
