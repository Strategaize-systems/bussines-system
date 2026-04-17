// =============================================================
// Meeting Invite Sender — Send individualized Jitsi invites via SMTP
// =============================================================
// Upgraded in SLC-417: now uses full template with .ics attachment.

import nodemailer from "nodemailer";
import {
  meetingInviteFullHtml,
  meetingInviteFullSubject,
  meetingInviteFullText,
} from "@/lib/email/templates/meeting-invite-full-de";
import { buildMeetingIcs } from "@/lib/meetings/ics-builder";

interface InviteRecipient {
  email: string;
  firstName: string;
  lastName: string;
  meetingUrl: string; // individual URL with participant JWT
}

interface SendInviteInput {
  meetingId: string;
  meetingTitle: string;
  meetingDate: string; // formatted date, e.g. "17. April 2026, 14:00 Uhr"
  scheduledAt: Date;
  durationMinutes: number;
  hostName: string;
  hostEmail: string;
  agenda?: string;
  location?: string | null;
  recipients: InviteRecipient[];
}

type Result = { ok: true; sent: number; failed: number } | { ok: false; error: string };

export async function sendMeetingInvites(input: SendInviteInput): Promise<Result> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD;
  const fromAddress = process.env.SMTP_FROM_EMAIL || smtpUser;

  if (!smtpHost || !smtpUser || !smtpPass || !fromAddress) {
    return { ok: false, error: "SMTP nicht konfiguriert" };
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  let sent = 0;
  let failed = 0;

  for (const recipient of input.recipients) {
    // Build individual .ics with this recipient as attendee
    const icsContent = buildMeetingIcs({
      meetingId: input.meetingId,
      title: input.meetingTitle,
      scheduledAt: input.scheduledAt,
      durationMinutes: input.durationMinutes,
      location: input.location,
      description: input.agenda,
      jitsiUrl: recipient.meetingUrl,
      organizerName: input.hostName,
      organizerEmail: input.hostEmail,
      attendees: [
        {
          name: `${recipient.firstName} ${recipient.lastName}`.trim(),
          email: recipient.email,
        },
      ],
    });

    const templateInput = {
      firstName: recipient.firstName,
      lastName: recipient.lastName,
      meetingTitle: input.meetingTitle,
      meetingDate: input.meetingDate,
      meetingUrl: recipient.meetingUrl,
      hostName: input.hostName,
      agenda: input.agenda,
    };

    try {
      await transporter.sendMail({
        from: fromAddress,
        to: recipient.email,
        subject: meetingInviteFullSubject(templateInput),
        text: meetingInviteFullText(templateInput),
        html: meetingInviteFullHtml(templateInput),
        icalEvent: {
          method: "REQUEST",
          content: icsContent,
        },
      });
      sent++;
    } catch {
      failed++;
    }
  }

  return { ok: true, sent, failed };
}
