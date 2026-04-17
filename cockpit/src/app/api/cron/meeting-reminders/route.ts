// =============================================================
// Meeting Reminders Cron — POST /api/cron/meeting-reminders
// =============================================================
// Runs every 5 minutes. Scans meetings in 25h window, sends external
// reminders (to contacts) and internal reminders (to host) at configured
// lead times. Idempotent via meetings.reminders_sent JSONB.
//
// External: per user_settings.meeting_reminder_external_hours (Default [24, 2])
// Internal: per user_settings.meeting_reminder_internal_enabled/minutes
// Opt-out: contacts with opt_out_communication=true are skipped

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "../verify-cron-secret";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildMeetingIcs, type IcsInput } from "@/lib/meetings/ics-builder";
import {
  meetingReminderSubject,
  meetingReminderText,
  meetingReminderHtml,
} from "@/lib/email/templates/meeting-reminder-de";
import nodemailer from "nodemailer";
import type { ReminderSentEntry } from "@/app/(app)/meetings/actions";

export const maxDuration = 60;

// ── Helpers ────────────────────────────────────────────────────

function formatMeetingDate(date: Date): string {
  return (
    date.toLocaleDateString("de-DE", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) + " Uhr"
  );
}

function createTransport() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD;
  const fromAddress = process.env.SMTP_FROM_EMAIL || smtpUser;

  if (!smtpHost || !smtpUser || !smtpPass || !fromAddress) {
    return null;
  }

  return {
    transporter: nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    }),
    fromAddress,
  };
}

/**
 * Check if a reminder was already sent for this meeting/type/recipient/hours combo.
 */
function wasAlreadySent(
  remindersSent: ReminderSentEntry[],
  type: string,
  recipient: string,
  hours: number
): boolean {
  return remindersSent.some(
    (r) =>
      r.type === type &&
      r.recipient === recipient &&
      // Encode hours in the type field: "external_24h" or "internal_30m"
      r.type === `${type}_${hours}`
  );
}

function makeReminderKey(type: "external" | "internal", value: number): string {
  return type === "external" ? `external_${value}h` : `internal_${value}m`;
}

function wasReminderSent(
  remindersSent: ReminderSentEntry[],
  key: string,
  recipient: string
): boolean {
  return remindersSent.some((r) => r.type === key && r.recipient === recipient);
}

// ── Main Handler ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const admin = createAdminClient();
  const now = new Date();

  try {
    // 1. Get all user_settings (for the host — currently single-user system)
    const { data: allSettings } = await admin
      .from("user_settings")
      .select("*");

    if (!allSettings || allSettings.length === 0) {
      console.log("[Cron/MeetingReminders] No user_settings rows found — skipping");
      return NextResponse.json({ success: true, sent: 0, skipped: "no_settings" });
    }

    // Build a map of user settings by user_id
    const settingsMap = new Map<string, typeof allSettings[0]>();
    for (const s of allSettings) {
      settingsMap.set(s.user_id, s);
    }

    // 2. Find meetings in the next 25 hours that are planned/in_progress
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const { data: meetings, error: meetingsError } = await admin
      .from("meetings")
      .select("*, contacts(id, first_name, last_name, email, opt_out_communication)")
      .in("status", ["planned", "in_progress"])
      .gte("scheduled_at", now.toISOString())
      .lte("scheduled_at", windowEnd.toISOString())
      .order("scheduled_at", { ascending: true });

    if (meetingsError) {
      console.error("[Cron/MeetingReminders] Query error:", meetingsError);
      return NextResponse.json({ error: meetingsError.message }, { status: 500 });
    }

    if (!meetings || meetings.length === 0) {
      console.log("[Cron/MeetingReminders] No upcoming meetings in 25h window");
      return NextResponse.json({ success: true, sent: 0, meetings: 0 });
    }

    // 3. Setup SMTP
    const smtp = createTransport();
    if (!smtp) {
      console.error("[Cron/MeetingReminders] SMTP not configured");
      return NextResponse.json({ error: "SMTP nicht konfiguriert" }, { status: 500 });
    }

    let totalSent = 0;
    let totalSkipped = 0;

    // 4. Process each meeting
    for (const meeting of meetings) {
      const remindersSent: ReminderSentEntry[] = meeting.reminders_sent ?? [];
      const scheduledAt = new Date(meeting.scheduled_at);
      const hoursUntilMeeting = (scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      const newReminders: ReminderSentEntry[] = [];

      // Get host settings
      const hostSettings = meeting.created_by
        ? settingsMap.get(meeting.created_by)
        : null;

      // Default external hours if no settings
      const externalHours: number[] =
        hostSettings?.meeting_reminder_external_hours ?? [24, 2];

      // Get host profile for organizer info
      const { data: hostProfile } = await admin
        .from("profiles")
        .select("display_name, email")
        .eq("id", meeting.created_by)
        .single();

      const hostName = hostProfile?.display_name || "StrategAIze";
      const hostEmail = hostProfile?.email || process.env.SMTP_FROM_EMAIL || "";

      // ── External Reminders (to contacts) ──

      // Check each configured hour: if meeting is within [h-0.1, h+0.1] hours
      // (±6 min window to account for 5-min cron interval)
      for (const h of externalHours) {
        if (hoursUntilMeeting > h + 0.1 || hoursUntilMeeting < h - 0.1) continue;

        // Meeting is within the reminder window for this hour setting
        const contact = meeting.contacts;
        if (!contact) continue;

        // Handle single contact (Supabase returns object for FK, not array)
        const contacts = Array.isArray(contact) ? contact : [contact];

        for (const c of contacts) {
          if (!c.email) continue;
          if (c.opt_out_communication) {
            totalSkipped++;
            continue;
          }

          const reminderKey = makeReminderKey("external", h);
          if (wasReminderSent(remindersSent, reminderKey, c.email)) {
            totalSkipped++;
            continue;
          }

          // Build .ics
          const icsContent = buildMeetingIcs({
            meetingId: meeting.id,
            title: meeting.title,
            scheduledAt,
            durationMinutes: meeting.duration_minutes || 60,
            location: meeting.location,
            description: meeting.agenda,
            jitsiUrl: null, // External participants get their own JWT URL in invite
            organizerName: hostName,
            organizerEmail: hostEmail,
            attendees: [{ name: `${c.first_name} ${c.last_name}`.trim(), email: c.email }],
          });

          const templateInput = {
            firstName: c.first_name,
            lastName: c.last_name,
            meetingTitle: meeting.title,
            meetingDate: formatMeetingDate(scheduledAt),
            hostName,
            reminderHours: h,
            agenda: meeting.agenda ?? undefined,
          };

          try {
            await smtp.transporter.sendMail({
              from: smtp.fromAddress,
              to: c.email,
              subject: meetingReminderSubject(templateInput),
              text: meetingReminderText(templateInput),
              html: meetingReminderHtml(templateInput),
              icalEvent: {
                method: "REQUEST",
                content: icsContent,
              },
            });

            newReminders.push({
              type: reminderKey,
              recipient: c.email,
              sent_at: now.toISOString(),
            });
            totalSent++;
          } catch (err) {
            console.error(
              `[Cron/MeetingReminders] Failed to send external reminder to ${c.email}:`,
              err instanceof Error ? err.message : err
            );
          }
        }
      }

      // ── Internal Reminder (to host via SMTP) ──

      if (
        hostSettings?.meeting_reminder_internal_enabled &&
        hostEmail &&
        meeting.created_by
      ) {
        const internalMinutes = hostSettings.meeting_reminder_internal_minutes ?? 30;
        const minutesUntilMeeting = hoursUntilMeeting * 60;

        // Check if within ±3 min of the configured internal reminder time
        if (
          minutesUntilMeeting <= internalMinutes + 3 &&
          minutesUntilMeeting >= internalMinutes - 3
        ) {
          const reminderKey = makeReminderKey("internal", internalMinutes);
          if (!wasReminderSent(remindersSent, reminderKey, hostEmail)) {
            const icsContent = buildMeetingIcs({
              meetingId: meeting.id,
              title: meeting.title,
              scheduledAt,
              durationMinutes: meeting.duration_minutes || 60,
              location: meeting.location,
              description: meeting.agenda,
              organizerName: hostName,
              organizerEmail: hostEmail,
            });

            const templateInput = {
              firstName: hostName.split(" ")[0] || hostName,
              lastName: hostName.split(" ").slice(1).join(" ") || "",
              meetingTitle: meeting.title,
              meetingDate: formatMeetingDate(scheduledAt),
              hostName,
              reminderHours: Math.round(internalMinutes / 60 * 10) / 10,
              agenda: meeting.agenda ?? undefined,
            };

            try {
              await smtp.transporter.sendMail({
                from: smtp.fromAddress,
                to: hostEmail,
                subject: meetingReminderSubject(templateInput),
                text: meetingReminderText(templateInput),
                html: meetingReminderHtml(templateInput),
                icalEvent: {
                  method: "REQUEST",
                  content: icsContent,
                },
              });

              newReminders.push({
                type: reminderKey,
                recipient: hostEmail,
                sent_at: now.toISOString(),
              });
              totalSent++;
            } catch (err) {
              console.error(
                `[Cron/MeetingReminders] Failed to send internal reminder to ${hostEmail}:`,
                err instanceof Error ? err.message : err
              );
            }
          }
        }
      }

      // 5. Update reminders_sent JSONB for idempotency
      if (newReminders.length > 0) {
        const updatedReminders = [...remindersSent, ...newReminders];
        await admin
          .from("meetings")
          .update({ reminders_sent: updatedReminders })
          .eq("id", meeting.id);
      }
    }

    console.log(
      `[Cron/MeetingReminders] Done. meetings=${meetings.length} sent=${totalSent} skipped=${totalSkipped}`
    );

    return NextResponse.json({
      success: true,
      meetings_checked: meetings.length,
      sent: totalSent,
      skipped: totalSkipped,
    });
  } catch (err) {
    console.error("[Cron/MeetingReminders] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
