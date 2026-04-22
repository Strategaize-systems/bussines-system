"use server";

import { createClient } from "@/lib/supabase/server";
import type { TrackingSummary } from "@/types/email-tracking";

/**
 * Fetch tracking summaries for a batch of email IDs.
 * Returns a map of email_id → TrackingSummary.
 */
export async function getTrackingSummaries(
  emailIds: string[]
): Promise<Record<string, TrackingSummary>> {
  if (emailIds.length === 0) return {};

  const supabase = await createClient();

  const { data: events, error } = await supabase
    .from("email_tracking_events")
    .select("email_id, event_type, link_url, created_at")
    .in("email_id", emailIds)
    .order("created_at", { ascending: true });

  if (error || !events) return {};

  const summaries: Record<string, TrackingSummary> = {};

  for (const event of events) {
    if (!summaries[event.email_id]) {
      summaries[event.email_id] = {
        open_count: 0,
        click_count: 0,
        first_opened_at: null,
        last_opened_at: null,
        clicked_links: [],
      };
    }

    const s = summaries[event.email_id];

    if (event.event_type === "open") {
      s.open_count++;
      if (!s.first_opened_at) s.first_opened_at = event.created_at;
      s.last_opened_at = event.created_at;
    } else if (event.event_type === "click") {
      s.click_count++;
      if (event.link_url) {
        const existing = s.clicked_links.find((l) => l.url === event.link_url);
        if (existing) {
          existing.count++;
        } else {
          s.clicked_links.push({ url: event.link_url, count: 1 });
        }
      }
    }
  }

  return summaries;
}
