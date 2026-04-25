/**
 * Default-Markdown-Bodies fuer die 3 Compliance-Template-Bloecke (FEAT-523, V5.2).
 * Diese Konstanten sind 1:1 identisch mit dem `default_body_markdown` der Datenbank-Rows
 * aus MIG-022. Sie dienen als Code-side Source-of-Truth und Fallback.
 *
 * Reset-to-Default greift zur Laufzeit auf den DB-Wert `default_body_markdown` zurueck
 * (vor-eingespielt durch MIG-022). Diese Konstanten werden nur als Fallback verwendet,
 * falls die DB-Zeile fehlt — z.B. bei lokalen Dev-Setups ohne Migration.
 *
 * WICHTIG: Bei Aenderung dieser Texte muss die Migration MIG-022 angepasst und auf
 * Production neu gespielt werden — sonst Drift zwischen Code und DB-Default.
 */

export type ComplianceTemplateKey =
  | "meeting_invitation"
  | "email_footer"
  | "calcom_booking";

export const COMPLIANCE_TEMPLATE_KEYS: ComplianceTemplateKey[] = [
  "meeting_invitation",
  "email_footer",
  "calcom_booking",
];

export const COMPLIANCE_TEMPLATE_LABELS: Record<ComplianceTemplateKey, string> = {
  meeting_invitation: "Meeting-Einladung",
  email_footer: "E-Mail-Footer",
  calcom_booking: "Cal.com-Buchungsbestaetigung",
};

export const COMPLIANCE_TEMPLATE_DESCRIPTIONS: Record<
  ComplianceTemplateKey,
  string
> = {
  meeting_invitation:
    "Einwilligungstext fuer Meeting-Einladungen mit Aufzeichnungs-Hinweis. Manuell in Outlook-/Calendar-Einladungen einfuegen.",
  email_footer:
    "Datenschutz-Footer fuer geschaeftliche E-Mails. In E-Mail-Signatur integrierbar.",
  calcom_booking:
    "Einwilligungstext fuer Cal.com-Buchungsformulare. Im Cal.com Custom-Question-Feld oder Beschreibung einfuegen.",
};

const MEETING_INVITATION_DEFAULT = `Hinweis zur Aufzeichnung und Datenverarbeitung

Im Rahmen dieses Online-Meetings kann eine Aufzeichnung erstellt werden, die im Anschluss zu einer schriftlichen Zusammenfassung verarbeitet wird. Die Verarbeitung dient der Dokumentation des Gespraechsverlaufs und der Vorbereitung weiterer Schritte zwischen {firma} und {kontakt_firma}.

- Verantwortlicher: {user_name}, {firma}
- Empfaenger: {kontakt_name}, {kontakt_firma}
- Speicherdauer der Aufzeichnung: maximal 7 Tage
- Speicherdauer der Zusammenfassung: bis Ende der Geschaeftsbeziehung

Mit der Teilnahme an diesem Meeting erklaeren Sie Ihr Einverstaendnis zur Aufzeichnung. Ein Widerspruch ist jederzeit moeglich an {user_email}; in diesem Fall wird auf die Aufzeichnung verzichtet.`;

const EMAIL_FOOTER_DEFAULT = `---

Datenschutzhinweis: Diese E-Mail wird zu Geschaeftszwecken zwischen {firma} und {kontakt_firma} gesendet. Inhalte koennen zur Vorbereitung weiterer Schritte verarbeitet und in unserem System gespeichert werden. Verantwortlich: {user_name} ({user_email}). Sie koennen einer weiteren Verarbeitung jederzeit per Antwort an diese E-Mail widersprechen.`;

const CALCOM_BOOKING_DEFAULT = `Mit der Buchung dieses Termins stimmen Sie zu, dass {user_name} ({firma}) die von Ihnen angegebenen Daten ({kontakt_name}, {kontakt_email}, {kontakt_firma}) zur Vorbereitung und Durchfuehrung des Termins verarbeitet.

Der Termin findet als Online-Meeting statt und kann zur Dokumentation aufgezeichnet werden. Die Aufzeichnung wird maximal 7 Tage gespeichert; eine schriftliche Zusammenfassung wird im Geschaeftsverlauf aufbewahrt.

Sie koennen Ihre Zustimmung jederzeit widerrufen, indem Sie an {user_email} antworten. Im Falle eines Widerrufs wird auf die Aufzeichnung verzichtet.`;

export const COMPLIANCE_TEMPLATE_DEFAULTS: Record<ComplianceTemplateKey, string> =
  {
    meeting_invitation: MEETING_INVITATION_DEFAULT,
    email_footer: EMAIL_FOOTER_DEFAULT,
    calcom_booking: CALCOM_BOOKING_DEFAULT,
  };
