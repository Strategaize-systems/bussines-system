// =============================================================
// Meeting Reminder Template — DE — with .ics Attachment
// =============================================================
// Sent by meeting-reminders cron at configured lead times.

type TemplateInput = {
  firstName: string;
  lastName: string;
  meetingTitle: string;
  meetingDate: string; // formatted date, e.g. "17. April 2026, 14:00 Uhr"
  meetingUrl?: string; // Jitsi URL (only for external participants with JWT)
  hostName: string;
  reminderHours: number; // how many hours before the meeting this reminder is for
  agenda?: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;").replace(/&/g, "&amp;");
}

function formatReminderText(hours: number): string {
  if (hours === 0) return "jetzt";
  if (hours === 1) return "in 1 Stunde";
  if (hours < 24) return `in ${hours} Stunden`;
  if (hours === 24) return "morgen";
  if (hours === 48) return "in 2 Tagen";
  return `in ${hours} Stunden`;
}

export function meetingReminderSubject(input: TemplateInput): string {
  const when = formatReminderText(input.reminderHours);
  return `Erinnerung: ${input.meetingTitle} — ${when}`;
}

export function meetingReminderText(input: TemplateInput): string {
  const name = `${input.firstName} ${input.lastName}`.trim();
  const when = formatReminderText(input.reminderHours);

  const lines = [
    `Hallo ${name || ""},`,
    "",
    `Ihr Meeting "${input.meetingTitle}" beginnt ${when}.`,
    "",
    `Termin: ${input.meetingDate}`,
  ];

  if (input.agenda) {
    lines.push(`Agenda: ${input.agenda}`);
  }

  if (input.meetingUrl) {
    lines.push("", "Meeting beitreten:", input.meetingUrl);
  }

  lines.push(
    "",
    "Im Anhang finden Sie eine Kalender-Datei (.ics) als Erinnerung.",
    "",
    "Mit freundlichen Gruessen",
    input.hostName,
  );

  return lines.join("\n");
}

export function meetingReminderHtml(input: TemplateInput): string {
  const name = escapeHtml(`${input.firstName} ${input.lastName}`.trim());
  const title = escapeHtml(input.meetingTitle);
  const date = escapeHtml(input.meetingDate);
  const host = escapeHtml(input.hostName);
  const when = escapeHtml(formatReminderText(input.reminderHours));

  let agendaBlock = "";
  if (input.agenda) {
    agendaBlock = `
      <tr>
        <td style="padding:4px 12px;color:#555;font-size:14px;">Agenda</td>
        <td style="padding:4px 12px;font-size:14px;">${escapeHtml(input.agenda)}</td>
      </tr>`;
  }

  let joinBlock = "";
  if (input.meetingUrl) {
    const url = escapeAttr(input.meetingUrl);
    joinBlock = `
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr><td>
                <a href="${url}" style="display:inline-block;background:#4454b8;color:#ffffff;font-size:15px;font-weight:600;padding:12px 28px;border-radius:6px;text-decoration:none;">
                  Meeting beitreten
                </a>
              </td></tr>
            </table>`;
  }

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f4f4f7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:#e67e22;padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:20px;">Meeting-Erinnerung</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;font-size:15px;color:#333;">Hallo ${name || ""},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#333;">
              Ihr Meeting <strong>${title}</strong> beginnt <strong>${when}</strong>.
            </p>

            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:4px 12px;color:#555;font-size:14px;width:80px;">Thema</td>
                <td style="padding:4px 12px;font-size:14px;font-weight:600;">${title}</td>
              </tr>
              <tr>
                <td style="padding:4px 12px;color:#555;font-size:14px;">Termin</td>
                <td style="padding:4px 12px;font-size:14px;">${date}</td>
              </tr>${agendaBlock}
            </table>

${joinBlock}
            <p style="margin:0 0 8px;font-size:13px;color:#888;">
              Im Anhang finden Sie eine aktualisierte Kalender-Datei (.ics).
            </p>

            <p style="margin:0;font-size:14px;color:#333;">Mit freundlichen Gruessen<br>${host}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
