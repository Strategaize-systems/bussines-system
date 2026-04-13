/**
 * Cal.com Sync-Service
 * Bidirectional sync between Cal.com bookings and calendar_events table.
 * Primary direction: Cal.com → calendar_events (via webhooks + initial sync).
 * SLC-407 / FEAT-406
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getBookings, type CalcomBooking } from "./api-client";

// ── Types ───────────────────────────────────────────────────────────

export type SyncResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

// ── Initial Sync (Pull all Cal.com bookings) ────────────────────────

/**
 * Pull all bookings from Cal.com and upsert into calendar_events.
 * Used for initial setup or re-sync after drift.
 */
export async function initialSync(): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [] };
  const supabase = createAdminClient();

  let bookings: CalcomBooking[];
  try {
    bookings = await getBookings();
  } catch (error) {
    result.errors.push(`Failed to fetch bookings: ${error}`);
    return result;
  }

  for (const booking of bookings) {
    // Skip cancelled bookings
    if (booking.status === "CANCELLED" || booking.status === "REJECTED") {
      result.skipped++;
      continue;
    }

    try {
      // Check if already synced
      const { data: existing } = await supabase
        .from("calendar_events")
        .select("id")
        .eq("source", "calcom")
        .eq("external_id", booking.uid)
        .maybeSingle();

      // Match attendee to contact
      const attendeeEmails = booking.attendees.map((a) => a.email);
      let contactId: string | null = null;
      let companyId: string | null = null;

      if (attendeeEmails.length > 0) {
        const { data: contact } = await supabase
          .from("contacts")
          .select("id, company_id")
          .in("email", attendeeEmails)
          .limit(1)
          .maybeSingle();

        if (contact) {
          contactId = contact.id;
          companyId = contact.company_id;
        }
      }

      const eventData = {
        title: booking.title,
        start_time: booking.startTime,
        end_time: booking.endTime,
        type: "meeting",
        description: booking.description,
        location: booking.location,
        contact_id: contactId,
        company_id: companyId,
        source: "calcom",
        external_id: booking.uid,
        sync_status: "synced",
      };

      if (existing) {
        const { error } = await supabase
          .from("calendar_events")
          .update(eventData)
          .eq("id", existing.id);

        if (error) {
          result.errors.push(`Update ${booking.uid}: ${error.message}`);
        } else {
          result.updated++;
        }
      } else {
        const { error } = await supabase
          .from("calendar_events")
          .insert(eventData);

        if (error) {
          result.errors.push(`Insert ${booking.uid}: ${error.message}`);
        } else {
          result.created++;
        }
      }
    } catch (error) {
      result.errors.push(`Booking ${booking.uid}: ${error}`);
    }
  }

  return result;
}

// ── Cleanup: Remove orphaned Cal.com events ─────────────────────────

/**
 * Remove calendar_events with source='calcom' that no longer exist in Cal.com.
 * Run periodically or after initial sync.
 */
export async function cleanupOrphaned(): Promise<{
  deleted: number;
  errors: string[];
}> {
  const result = { deleted: 0, errors: [] as string[] };
  const supabase = createAdminClient();

  // Get all local calcom events
  const { data: localEvents, error: fetchError } = await supabase
    .from("calendar_events")
    .select("id, external_id")
    .eq("source", "calcom")
    .not("external_id", "is", null);

  if (fetchError || !localEvents) {
    result.errors.push(`Fetch local events: ${fetchError?.message}`);
    return result;
  }

  if (localEvents.length === 0) return result;

  // Get all current Cal.com bookings
  let remoteBookings: CalcomBooking[];
  try {
    remoteBookings = await getBookings();
  } catch (error) {
    result.errors.push(`Fetch remote bookings: ${error}`);
    return result;
  }

  const remoteUids = new Set(remoteBookings.map((b) => b.uid));

  // Delete local events that no longer exist remotely
  for (const event of localEvents) {
    if (event.external_id && !remoteUids.has(event.external_id)) {
      const { error } = await supabase
        .from("calendar_events")
        .delete()
        .eq("id", event.id);

      if (error) {
        result.errors.push(`Delete ${event.id}: ${error.message}`);
      } else {
        result.deleted++;
      }
    }
  }

  return result;
}
