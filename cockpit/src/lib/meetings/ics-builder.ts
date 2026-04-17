// =============================================================
// .ics Calendar Event Builder — RFC 5545 via ical-generator
// =============================================================
// Generates VCALENDAR / VEVENT content for meeting invites and reminders.
// Used by: meeting-invite-full-de.ts, meeting-reminder-de.ts, send-invite.ts

import ical, { ICalCalendarMethod, ICalAlarmType } from "ical-generator";

export interface IcsInput {
  meetingId: string;
  title: string;
  scheduledAt: Date;
  durationMinutes: number;
  location?: string | null;
  description?: string | null;
  jitsiUrl?: string | null;
  organizerName: string;
  organizerEmail: string;
  attendees?: Array<{
    name: string;
    email: string;
  }>;
}

/**
 * Build a RFC-5545-compliant .ics calendar string for a meeting.
 *
 * Features:
 * - VEVENT with UID, DTSTART, DTEND, SUMMARY, DESCRIPTION, LOCATION
 * - ATTENDEE entries for each participant
 * - ORGANIZER with host info
 * - VALARM 15 minutes before start
 * - Timezone: Europe/Berlin
 * - METHOD: REQUEST (for invites)
 */
export function buildMeetingIcs(input: IcsInput): string {
  const endTime = new Date(
    input.scheduledAt.getTime() + input.durationMinutes * 60 * 1000
  );

  // Build description: agenda + Jitsi link
  const descParts: string[] = [];
  if (input.description) {
    descParts.push(input.description);
  }
  if (input.jitsiUrl) {
    descParts.push(`\nMeeting beitreten: ${input.jitsiUrl}`);
  }
  const fullDescription = descParts.join("\n") || undefined;

  const cal = ical({
    method: ICalCalendarMethod.REQUEST,
    prodId: "//StrategAIze//Business System//DE",
    timezone: "Europe/Berlin",
  });

  const event = cal.createEvent({
    id: `meeting-${input.meetingId}@strategaize`,
    start: input.scheduledAt,
    end: endTime,
    timezone: "Europe/Berlin",
    summary: input.title,
    description: fullDescription,
    location: input.jitsiUrl || input.location || undefined,
    organizer: {
      name: input.organizerName,
      email: input.organizerEmail,
    },
  });

  // Add attendees
  if (input.attendees) {
    for (const attendee of input.attendees) {
      event.createAttendee({
        name: attendee.name,
        email: attendee.email,
      });
    }
  }

  // 15-minute reminder alarm
  event.createAlarm({
    type: ICalAlarmType.display,
    trigger: 15 * 60, // 15 minutes before in seconds
    description: `Erinnerung: ${input.title}`,
  });

  return cal.toString();
}
