# FEAT-405 — IMAP Mail-Integration

## Purpose
Eingehende E-Mails automatisch synchronisieren, speichern und im Business System verfuegbar machen. Fundament fuer KI-Gatekeeper (FEAT-408) und KI-Kontextanalyse (FEAT-410).

## Feature Type
Backend + Frontend

## Version
V4

## Dependencies
- Keine (ist selbst Fundament fuer FEAT-408, FEAT-410)

## Infrastructure
- `imapflow` Library fuer IMAP-Verbindung
- IONOS IMAP-Server direkt (imap.ionos.de, Port 993, SSL) — DEC-030
- Background-Sync-Service (Node.js, Polling-basiert)
- Polling-Intervall: konfigurierbar, Default 5 Minuten
- IMAP IDLE als spaetere Option fuer Echtzeit

## Database Changes
- Neue Tabelle: `email_messages` (from, to, cc, subject, body_text, body_html, received_at, message_id, in_reply_to, references, headers_json, contact_id, company_id, deal_id, classification, priority, is_read, is_auto_reply, thread_id, synced_at, retention_expires_at)
- Neue Tabelle: `email_threads` (thread_id, subject, first_message_at, last_message_at, message_count, contact_id, company_id, deal_id)
- Neue Tabelle: `email_sync_state` (folder, last_uid, last_sync_at, status, error_message)

## Funktionen

### E-Mail-Sync
- INBOX synchronisieren (+ konfigurierbare zusaetzliche Ordner)
- Inkrementeller Sync via UID-Tracking (nur neue E-Mails)
- Retry-Logik bei Verbindungsabbruch
- Sync-Status in Settings sichtbar (letzte Sync, Anzahl, Fehler)

### Kontakt-Zuordnung
- Automatische Zuordnung via E-Mail-Adresse → contacts.email
- Wenn Kontakt einer Firma zugeordnet → auch company_id setzen
- Wenn Deal offen fuer diesen Kontakt → auch deal_id setzen
- Nicht zuordenbare E-Mails → "Unzugeordnet"-Queue

### E-Mail-Ansicht
- E-Mail-Detail-Ansicht im System (Subject, Body, Attachments)
- E-Mails in Unified Timeline anzeigen (Kontakt, Firma, Deal)
- Thread-Gruppierung (In-Reply-To / References Header)

### Attachment-Handling
- Metadaten speichern (Filename, MIME-Type, Size)
- Download via IMAP on-demand (nicht lokal speichern)
- Spaeter: Attachment in Supabase Storage speichern (optional)

### DSGVO / Retention
- 90-Tage Retention Policy (konfigurierbar)
- Automatische Loeschung abgelaufener E-Mails
- Retention-Timer startet bei Sync-Zeitpunkt

## Nicht V4
- Ausgehende E-Mails via IMAP senden (SMTP bleibt)
- Multi-Account (nur ein Postfach)
- Ordner-Management im System
- Full-Text-Search ueber E-Mail-Body
- Attachment-Vorschau im Browser

## Akzeptanzkriterien
1. Eingehende E-Mails werden automatisch synchronisiert (max. 5 Min Delay)
2. E-Mails werden korrekt Kontakten/Firmen zugeordnet (via gespeicherte E-Mail-Adressen)
3. Nicht zuordenbare E-Mails landen in "Unzugeordnet"-Queue
4. E-Mails erscheinen in Unified Timeline des zugeordneten Kontakts/Firma/Deals
5. Thread-Erkennung gruppiert zusammengehoerige E-Mails
6. Sync-Status ist in Settings sichtbar (letzte Sync, Anzahl, Fehler)
7. Retention Policy loescht E-Mails aelter als 90 Tage automatisch
8. IONOS IMAP-Verbindung funktioniert mit SSL auf Port 993

## Risiken
- IONOS IMAP-Zuverlaessigkeit → Retry-Logik + Monitoring
- Grosses Postfach beim Erst-Sync → Limit auf letzte 90 Tage beim Initial-Sync
- Header-Parsing-Qualitaet → Standard-Libraries (mailparser) verwenden
