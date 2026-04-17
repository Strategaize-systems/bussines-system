// =============================================================
// Meeting Invite Template (Full) — DE — with .ics Attachment
// =============================================================
// Replaces meeting-invite-basic-de.ts for all invites from SLC-417 onwards.
// Adds .ics calendar attachment to the email.

type TemplateInput = {
  firstName: string;
  lastName: string;
  meetingTitle: string;
  meetingDate: string; // formatted date, e.g. "17. April 2026, 14:00 Uhr"
  meetingUrl: string; // full Jitsi URL with JWT
  hostName: string;
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

export function meetingInviteFullSubject(input: TemplateInput): string {
  return `Einladung: ${input.meetingTitle}`;
}

export function meetingInviteFullText(input: TemplateInput): string {
  const name = `${input.firstName} ${input.lastName}`.trim();
  const lines = [
    `Hallo ${name || ""},`,
    "",
    `${input.hostName} laedt Sie zu einem Meeting ein:`,
    "",
    `Thema: ${input.meetingTitle}`,
    `Termin: ${input.meetingDate}`,
  ];

  if (input.agenda) {
    lines.push(`Agenda: ${input.agenda}`);
  }

  lines.push(
    "",
    "Meeting beitreten:",
    input.meetingUrl,
    "",
    "Im Anhang finden Sie eine Kalender-Datei (.ics) zum Importieren in Ihren Kalender.",
    "",
    "Der Link ist persoenlich fuer Sie — bitte nicht weiterleiten.",
    "Er ist 6 Stunden nach dem geplanten Beginn gueltig.",
    "",
    "Mit freundlichen Gruessen",
    input.hostName,
  );

  return lines.join("\n");
}

export function meetingInviteFullHtml(input: TemplateInput): string {
  const name = escapeHtml(`${input.firstName} ${input.lastName}`.trim());
  const title = escapeHtml(input.meetingTitle);
  const date = escapeHtml(input.meetingDate);
  const host = escapeHtml(input.hostName);
  const url = escapeAttr(input.meetingUrl);

  let agendaBlock = "";
  if (input.agenda) {
    agendaBlock = `
      <tr>
        <td style="padding:4px 12px;color:#555;font-size:14px;">Agenda</td>
        <td style="padding:4px 12px;font-size:14px;">${escapeHtml(input.agenda)}</td>
      </tr>`;
  }

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f4f4f7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:#4454b8;padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:20px;">Meeting-Einladung</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;font-size:15px;color:#333;">Hallo ${name || ""},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#333;">${host} laedt Sie zu einem Meeting ein:</p>

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

            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr><td>
                <a href="${url}" style="display:inline-block;background:#4454b8;color:#ffffff;font-size:15px;font-weight:600;padding:12px 28px;border-radius:6px;text-decoration:none;">
                  Meeting beitreten
                </a>
              </td></tr>
            </table>

            <p style="margin:0 0 8px;font-size:13px;color:#888;">
              Im Anhang finden Sie eine Kalender-Datei (.ics) zum Importieren.
            </p>
            <p style="margin:0 0 8px;font-size:13px;color:#888;">
              Der Link ist persoenlich fuer Sie — bitte nicht weiterleiten.
            </p>
            <p style="margin:0 0 24px;font-size:13px;color:#888;">
              Gueltig bis 6 Stunden nach dem geplanten Beginn.
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
