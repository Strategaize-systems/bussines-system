-- =====================================================
-- MIG-022 — V5.2 Compliance Templates
-- =====================================================
-- 1 neue Tabelle: compliance_templates
-- 3 Default-Rows fuer 3 Template-Keys
-- RLS, Grants, idempotenter INSERT
-- Idempotent: IF NOT EXISTS auf CREATE; ON CONFLICT DO NOTHING auf INSERT

-- =====================================================
-- 1. compliance_templates (FEAT-523, DEC-083)
-- =====================================================
-- Eigene Tabelle (statt user_settings-JSONB) — sauberes Schema, Reset-to-Default trivial.
-- Single-tenant in V5.2; Multi-User-Erweiterung spaeter additiv via ALTER TABLE.

CREATE TABLE IF NOT EXISTS compliance_templates (
  template_key TEXT PRIMARY KEY
    CHECK (template_key IN ('meeting_invitation', 'email_footer', 'calcom_booking')),
  body_markdown TEXT NOT NULL,
  default_body_markdown TEXT NOT NULL,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 2. RLS + Policies + Grants
-- =====================================================

ALTER TABLE compliance_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'compliance_templates' AND policyname = 'authenticated_full_access'
  ) THEN
    CREATE POLICY "authenticated_full_access" ON compliance_templates
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON compliance_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON compliance_templates TO service_role;

-- =====================================================
-- 3. Default-Rows (3 Templates)
-- =====================================================
-- body_markdown == default_body_markdown beim Erstinsert (Reset == initial state).
-- Texte: pragmatische DE-DSGVO-Standardtexte mit Token-Platzhaltern.
-- Hinweis: Vor produktivem Einsatz anwaltlich pruefen lassen.

INSERT INTO compliance_templates (template_key, body_markdown, default_body_markdown)
VALUES
  (
    'meeting_invitation',
$$Hinweis zur Aufzeichnung und Datenverarbeitung

Im Rahmen dieses Online-Meetings kann eine Aufzeichnung erstellt werden, die im Anschluss zu einer schriftlichen Zusammenfassung verarbeitet wird. Die Verarbeitung dient der Dokumentation des Gespraechsverlaufs und der Vorbereitung weiterer Schritte zwischen {firma} und {kontakt_firma}.

- Verantwortlicher: {user_name}, {firma}
- Empfaenger: {kontakt_name}, {kontakt_firma}
- Speicherdauer der Aufzeichnung: maximal 7 Tage
- Speicherdauer der Zusammenfassung: bis Ende der Geschaeftsbeziehung

Mit der Teilnahme an diesem Meeting erklaeren Sie Ihr Einverstaendnis zur Aufzeichnung. Ein Widerspruch ist jederzeit moeglich an {user_email}; in diesem Fall wird auf die Aufzeichnung verzichtet.$$,
$$Hinweis zur Aufzeichnung und Datenverarbeitung

Im Rahmen dieses Online-Meetings kann eine Aufzeichnung erstellt werden, die im Anschluss zu einer schriftlichen Zusammenfassung verarbeitet wird. Die Verarbeitung dient der Dokumentation des Gespraechsverlaufs und der Vorbereitung weiterer Schritte zwischen {firma} und {kontakt_firma}.

- Verantwortlicher: {user_name}, {firma}
- Empfaenger: {kontakt_name}, {kontakt_firma}
- Speicherdauer der Aufzeichnung: maximal 7 Tage
- Speicherdauer der Zusammenfassung: bis Ende der Geschaeftsbeziehung

Mit der Teilnahme an diesem Meeting erklaeren Sie Ihr Einverstaendnis zur Aufzeichnung. Ein Widerspruch ist jederzeit moeglich an {user_email}; in diesem Fall wird auf die Aufzeichnung verzichtet.$$
  ),
  (
    'email_footer',
$$---

Datenschutzhinweis: Diese E-Mail wird zu Geschaeftszwecken zwischen {firma} und {kontakt_firma} gesendet. Inhalte koennen zur Vorbereitung weiterer Schritte verarbeitet und in unserem System gespeichert werden. Verantwortlich: {user_name} ({user_email}). Sie koennen einer weiteren Verarbeitung jederzeit per Antwort an diese E-Mail widersprechen.$$,
$$---

Datenschutzhinweis: Diese E-Mail wird zu Geschaeftszwecken zwischen {firma} und {kontakt_firma} gesendet. Inhalte koennen zur Vorbereitung weiterer Schritte verarbeitet und in unserem System gespeichert werden. Verantwortlich: {user_name} ({user_email}). Sie koennen einer weiteren Verarbeitung jederzeit per Antwort an diese E-Mail widersprechen.$$
  ),
  (
    'calcom_booking',
$$Mit der Buchung dieses Termins stimmen Sie zu, dass {user_name} ({firma}) die von Ihnen angegebenen Daten ({kontakt_name}, {kontakt_email}, {kontakt_firma}) zur Vorbereitung und Durchfuehrung des Termins verarbeitet.

Der Termin findet als Online-Meeting statt und kann zur Dokumentation aufgezeichnet werden. Die Aufzeichnung wird maximal 7 Tage gespeichert; eine schriftliche Zusammenfassung wird im Geschaeftsverlauf aufbewahrt.

Sie koennen Ihre Zustimmung jederzeit widerrufen, indem Sie an {user_email} antworten. Im Falle eines Widerrufs wird auf die Aufzeichnung verzichtet.$$,
$$Mit der Buchung dieses Termins stimmen Sie zu, dass {user_name} ({firma}) die von Ihnen angegebenen Daten ({kontakt_name}, {kontakt_email}, {kontakt_firma}) zur Vorbereitung und Durchfuehrung des Termins verarbeitet.

Der Termin findet als Online-Meeting statt und kann zur Dokumentation aufgezeichnet werden. Die Aufzeichnung wird maximal 7 Tage gespeichert; eine schriftliche Zusammenfassung wird im Geschaeftsverlauf aufbewahrt.

Sie koennen Ihre Zustimmung jederzeit widerrufen, indem Sie an {user_email} antworten. Im Falle eines Widerrufs wird auf die Aufzeichnung verzichtet.$$
  )
ON CONFLICT (template_key) DO NOTHING;

-- =====================================================
-- 4. Verifikations-Queries (manuell, nach Deploy)
-- =====================================================
-- SELECT template_key, length(body_markdown) AS body_len, updated_at
--   FROM compliance_templates
--   ORDER BY template_key;
--
-- Erwartet: 3 Rows (calcom_booking, email_footer, meeting_invitation), body_len > 0.
