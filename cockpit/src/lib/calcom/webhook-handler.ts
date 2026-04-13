/**
 * Cal.com Webhook Handler
 * Processes incoming Cal.com webhook events → calendar_events table.
 * SLC-407 / FEAT-406
 */

import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

// ── Types ───────────────────────────────────────────────────────────

export type CalcomWebhookEvent =
  | "BOOKING_CREATED"
  | "BOOKING_RESCHEDULED"
  | "BOOKING_CANCELLED"
  | "BOOKING_REJECTED"
  | "BOOKING_REQUESTED"
  | "BOOKING_PAYMENT_INITIATED";

export type CalcomWebhookPayload = {
  triggerEvent: CalcomWebhookEvent;
  createdAt: string;
  payload: {
    id: number;
    uid: string;
    title: string;
    startTime: string;
    endTime: string;
    status: string;
    location: string | null;
    description: string | null;
    attendees: { email: string; name: string; timeZone: string }[];
    organizer: { email: string; name: string; timeZone: string };
    eventTypeId: number | null;
    metadata: Record<string, unknown> | null;
    bookingId?: number;
  };
};

// ── Signature Verification ──────────────────────────────────────────

export function verifyWebhookSignature(
  payload: string,
  signature: string | null
): boolean {
  const secret = process.env.CALCOM_WEBHOOK_SECRET;
  if (!secret) return false;
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);

  if (sigBuf.length !== expBuf.length) return false;

  return crypto.timingSafeEqual(sigBuf, expBuf);
}

// ── Event Processing ────────────────────────────────────────────────

export async function handleWebhookEvent(
  event: CalcomWebhookPayload
): Promise<{ action: string; id?: string }> {
  switch (event.triggerEvent) {
    case "BOOKING_CREATED":
    case "BOOKING_REQUESTED":
      return upsertCalendarEvent(event.payload);
    case "BOOKING_RESCHEDULED":
      return upsertCalendarEvent(event.payload);
    case "BOOKING_CANCELLED":
    case "BOOKING_REJECTED":
      return deleteCalendarEvent(event.payload.uid);
    default:
      return { action: "ignored" };
  }
}

// ── Calendar Event CRUD ─────────────────────────────────────────────

async function upsertCalendarEvent(
  booking: CalcomWebhookPayload["payload"]
): Promise<{ action: string; id?: string }> {
  const supabase = createAdminClient();

  // Check if event already exists (by external_id)
  const { data: existing } = await supabase
    .from("calendar_events")
    .select("id")
    .eq("source", "calcom")
    .eq("external_id", booking.uid)
    .maybeSingle();

  // Try to match attendee email to a contact
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
    type: "meeting" as const,
    description: booking.description,
    location: booking.location,
    contact_id: contactId,
    company_id: companyId,
    source: "calcom",
    external_id: booking.uid,
    sync_status: "synced",
  };

  if (existing) {
    // Update
    const { error } = await supabase
      .from("calendar_events")
      .update(eventData)
      .eq("id", existing.id);

    if (error) throw new Error(`Update calendar_event failed: ${error.message}`);
    return { action: "updated", id: existing.id };
  } else {
    // Insert
    const { data, error } = await supabase
      .from("calendar_events")
      .insert(eventData)
      .select("id")
      .single();

    if (error) throw new Error(`Insert calendar_event failed: ${error.message}`);
    return { action: "created", id: data.id };
  }
}

async function deleteCalendarEvent(
  bookingUid: string
): Promise<{ action: string; id?: string }> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("calendar_events")
    .select("id")
    .eq("source", "calcom")
    .eq("external_id", bookingUid)
    .maybeSingle();

  if (!existing) return { action: "not_found" };

  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", existing.id);

  if (error) throw new Error(`Delete calendar_event failed: ${error.message}`);
  return { action: "deleted", id: existing.id };
}
