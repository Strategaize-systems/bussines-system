"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  buildModeratorJwt,
  buildParticipantJwt,
  buildMeetingUrl,
  generateRoomName,
} from "@/lib/meetings/jitsi-jwt";
import { checkConsentStatus } from "@/lib/meetings/consent-check";
import { sendMeetingInvites } from "@/lib/meetings/send-invite";

// ── Types ──────────────────────────────────────────────────────

export interface StartMeetingResult {
  error: string;
  /** Full Jitsi URL with host Moderator-JWT */
  hostRedirectUrl?: string;
  /** Whether recording will be enabled (all participants have consent) */
  recordingEnabled?: boolean;
  /** Contacts without granted consent */
  missingConsent?: Array<{ name: string; email: string }>;
  /** How many invite emails were sent */
  invitesSent?: number;
}

// ── Helpers ────────────────────────────────────────────────────

function formatMeetingDate(date: Date): string {
  return date.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) + " Uhr";
}

// ── Server Action ──────────────────────────────────────────────

/**
 * Start a Jitsi meeting from a deal workspace.
 *
 * Flow:
 * 1. Create or reuse meeting row for the deal
 * 2. Generate jitsi_room_name
 * 3. Check consent status of all participants
 * 4. Generate Moderator-JWT (host) + Participant-JWTs (external)
 * 5. Send invite emails with individualized JWT links
 * 6. Log audit entries
 * 7. Return host redirect URL
 */
export async function startMeeting(
  dealId: string,
  contactIds: string[],
  meetingTitle?: string,
): Promise<StartMeetingResult> {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Nicht authentifiziert" };
  }

  const admin = createAdminClient();

  // Get deal info for meeting title
  const { data: deal } = await admin
    .from("deals")
    .select("id, title")
    .eq("id", dealId)
    .single();

  if (!deal) {
    return { error: "Deal nicht gefunden" };
  }

  // Get user profile for host name
  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .single();

  const hostName = profile?.display_name || user.email || "Host";
  const hostEmail = profile?.email || user.email;

  // Generate room name
  const roomName = generateRoomName(dealId);
  const title = meetingTitle || `Meeting: ${deal.title}`;
  const scheduledAt = new Date();

  // Create meeting row
  const { data: meeting, error: meetingError } = await admin
    .from("meetings")
    .insert({
      title,
      deal_id: dealId,
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: 60,
      status: "in_progress",
      jitsi_room_name: roomName,
      recording_status: "not_recording",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (meetingError) {
    return { error: `Meeting-Erstellung fehlgeschlagen: ${meetingError.message}` };
  }

  // Check consent for all contacts
  const consentResult = await checkConsentStatus(contactIds);
  const recordingEnabled = consentResult.allGranted && contactIds.length > 0;

  // Update recording status based on consent
  if (recordingEnabled) {
    await admin
      .from("meetings")
      .update({ recording_status: "pending" })
      .eq("id", meeting.id);
  }

  // Build host Moderator-JWT
  const hostJwt = buildModeratorJwt(
    { id: user.id, name: hostName, email: hostEmail },
    roomName,
  );
  const hostRedirectUrl = buildMeetingUrl(roomName, hostJwt);

  // Build Participant-JWTs + send invites for contacts
  const meetingExpiresAt = new Date(scheduledAt.getTime() + 6 * 60 * 60 * 1000);

  // Get full contact info for all participants
  let invitesSent = 0;
  if (contactIds.length > 0) {
    const { data: contacts } = await admin
      .from("contacts")
      .select("id, first_name, last_name, email, consent_status, opt_out_communication")
      .in("id", contactIds);

    // Build invite recipients (skip opt_out_communication contacts)
    const recipients = (contacts ?? [])
      .filter((c) => !c.opt_out_communication && c.email)
      .map((c) => {
        const participantJwt = buildParticipantJwt(
          {
            id: c.id,
            name: `${c.first_name} ${c.last_name}`.trim(),
            email: c.email,
          },
          roomName,
          meetingExpiresAt,
        );

        return {
          email: c.email,
          firstName: c.first_name,
          lastName: c.last_name,
          meetingUrl: buildMeetingUrl(roomName, participantJwt),
        };
      });

    if (recipients.length > 0) {
      const inviteResult = await sendMeetingInvites({
        meetingTitle: title,
        meetingDate: formatMeetingDate(scheduledAt),
        hostName,
        recipients,
      });

      if (inviteResult.ok) {
        invitesSent = inviteResult.sent;
      }
    }

    // Log jwt_issued for each contact
    for (const c of contacts ?? []) {
      await admin.from("audit_log").insert({
        actor_id: user.id,
        action: "create",
        entity_type: "meeting",
        entity_id: meeting.id,
        changes: { after: { event: "jwt_issued", contact_id: c.id, room: roomName } },
        context: `JWT issued for ${c.first_name} ${c.last_name}`,
      });
    }
  }

  // Log meeting_started
  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "create",
    entity_type: "meeting",
    entity_id: meeting.id,
    changes: {
      after: {
        event: "meeting_started",
        room: roomName,
        recording_enabled: recordingEnabled,
        participants: contactIds.length,
      },
    },
    context: `Meeting started: ${title}`,
  });

  // Create activity for timeline
  await admin.from("activities").insert({
    type: "meeting",
    title,
    description: recordingEnabled
      ? "Meeting gestartet — Aufzeichnung aktiv"
      : "Meeting gestartet — Aufzeichnung deaktiviert (fehlender Consent)",
    deal_id: dealId,
    source_type: "meeting",
    source_id: meeting.id,
    created_by: user.id,
  });

  revalidatePath("/meetings");
  revalidatePath("/mein-tag");
  revalidatePath(`/deals/${dealId}`);

  return {
    error: "",
    hostRedirectUrl,
    recordingEnabled,
    missingConsent: consentResult.missing.map((c) => ({
      name: `${c.first_name} ${c.last_name}`.trim(),
      email: c.email,
    })),
    invitesSent,
  };
}
