// =============================================================
// Meeting Invite Sender — Send individualized Jitsi invites via SMTP
// =============================================================

import nodemailer from "nodemailer";
import {
  meetingInviteHtml,
  meetingInviteSubject,
  meetingInviteText,
} from "@/lib/email/templates/meeting-invite-basic-de";

interface InviteRecipient {
  email: string;
  firstName: string;
  lastName: string;
  meetingUrl: string; // individual URL with participant JWT
}

interface SendInviteInput {
  meetingTitle: string;
  meetingDate: string;   // formatted date, e.g. "17. April 2026, 14:00 Uhr"
  hostName: string;
  agenda?: string;
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
        subject: meetingInviteSubject(templateInput),
        text: meetingInviteText(templateInput),
        html: meetingInviteHtml(templateInput),
      });
      sent++;
    } catch {
      failed++;
    }
  }

  return { ok: true, sent, failed };
}
