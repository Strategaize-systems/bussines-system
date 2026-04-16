type TemplateInput = {
  firstName: string;
  lastName: string;
  consentUrl: string;
  revokeUrl: string;
};

export function consentRequestSubject(): string {
  return "Einwilligung zur Verarbeitung Ihrer Kontaktdaten";
}

export function consentRequestText(input: TemplateInput): string {
  const name = `${input.firstName} ${input.lastName}`.trim();
  return [
    `Hallo ${name || ""},`,
    "",
    "wir speichern Ihre Kontaktdaten in unserem Business-System, um Sie im Rahmen unserer",
    "Zusammenarbeit kontaktieren zu koennen (Meetings, Nachfassen, Terminabstimmung).",
    "",
    "Damit das DSGVO-konform erfolgt, bitten wir um Ihre Einwilligung.",
    "Sie koennen die Einwilligung jederzeit widerrufen.",
    "",
    "Einwilligung erteilen oder ablehnen:",
    input.consentUrl,
    "",
    "Spaeter widerrufen:",
    input.revokeUrl,
    "",
    "Wenn Sie keine Einwilligung erteilen, speichern wir nur, dass Sie angefragt wurden,",
    "und kontaktieren Sie nicht weiter.",
    "",
    "Viele Gruesse",
    "Immo Bellaerts",
  ].join("\n");
}

export function consentRequestHtml(input: TemplateInput): string {
  const name = `${input.firstName} ${input.lastName}`.trim();
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><title>Einwilligung</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 24px auto; color: #1a1a1a;">
  <p>Hallo ${escapeHtml(name)},</p>
  <p>
    wir speichern Ihre Kontaktdaten in unserem Business-System, um Sie im Rahmen unserer
    Zusammenarbeit kontaktieren zu k&ouml;nnen (Meetings, Nachfassen, Terminabstimmung).
  </p>
  <p>
    Damit das DSGVO-konform erfolgt, bitten wir um Ihre Einwilligung.
    Sie k&ouml;nnen die Einwilligung jederzeit widerrufen.
  </p>
  <p style="margin: 24px 0;">
    <a href="${escapeAttr(input.consentUrl)}"
       style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block;">
      Einwilligung erteilen oder ablehnen
    </a>
  </p>
  <p style="font-size: 13px; color: #555;">
    Sp&auml;ter widerrufen: <a href="${escapeAttr(input.revokeUrl)}">${escapeHtml(input.revokeUrl)}</a>
  </p>
  <p style="font-size: 13px; color: #555;">
    Wenn Sie keine Einwilligung erteilen, speichern wir nur, dass Sie angefragt wurden,
    und kontaktieren Sie nicht weiter.
  </p>
  <p>Viele Gr&uuml;&szlig;e<br>Immo Bellaerts</p>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
