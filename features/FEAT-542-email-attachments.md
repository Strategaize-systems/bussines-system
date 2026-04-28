# FEAT-542 — E-Mail-Anhaenge-Upload (PC-Direkt)

## Summary
User kann im Composing-Studio (`/emails/compose`) Dateien von seinem PC per Drag&Drop oder File-Picker an seine ausgehende Mail anhaengen. Anhang wird in einem dedizierten privaten Storage-Bucket persistiert, mit der `emails`-Row via Junction-Table verknuepft, und beim SMTP-Versand als Multipart-Anhang mitgesendet.

## Problem
Der Composing-Studio-Workflow ist ohne Anhang-Funktion nicht vollstaendig fuer den realen Vertriebs-Alltag. Der User muss heute — wenn er ein PDF, ein Bilder-Paket oder eine Praesentation an einen Lead schicken will — den Mail-Versand komplett ausserhalb des Systems durchfuehren (Outlook/Gmail-Web). Damit faellt fuer diese Mails das gesamte Tracking, IMAP-Auto-Zuordnung und Deal-Activity-Logging weg. Konkreter Daten-Verlust gegenueber der Vision "alle Mails laufen ueber das System".

## Solution
**Storage-Bucket `email-attachments`** (analog Branding-Bucket-Pattern aus DEC-085):
- Privater Bucket auf Self-Hosted Supabase
- Public-Read = nein
- service_role-Access fuer Insert/Read
- SELECT-Policy fuer authenticated mit Path-Owner-Check
- Path-Schema: `{user_id}/{compose_session_id}/{filename}` (Pre-Send) → bei Send-Action gemappt via Junction-Table

**Junction-Table `email_attachments`:**
```
id              UUID PK
email_id        UUID FK -> emails(id)
storage_path    TEXT
filename        TEXT
mime_type       TEXT
size_bytes      BIGINT
created_at      TIMESTAMPTZ DEFAULT now()
```
N:1-Beziehung zu `emails`. Index auf `email_id`.

**MIG-025:** Bucket + Storage-Policies + Junction-Table + Index.

**Compose-Form-UI:**
- Anhang-Bereich unterhalb der Body-Textarea
- Drag&Drop-Zone + File-Picker-Button "Datei anhaengen"
- Liste der ausgewaehlten Anhaenge: Icon (MIME-basiert), Filename, Size, Loeschen-Button
- Mehrere Anhaenge moeglich

**MIME-Whitelist (Source-of-Truth: `cockpit/src/lib/email/attachments-whitelist.ts`):**
- Erlaubt: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, PNG, JPG, JPEG, GIF, TXT, CSV, ZIP
- Verboten: EXE, BAT, SH, JS, andere Scripting-Formate
- ZIP wird akzeptiert ohne Inhalt-Inspection (B2B-Realitaet, Empfaenger-Filter ist zweite Linie)
- Validierung im Browser (UX) UND im Server-Action (Sicherheit)

**Size-Limits:**
- 10 MB pro File
- 25 MB Total pro Mail
- Validierung Client + Server

**Upload-Flow:**
1. File-Auswahl im Compose-Form
2. Browser-Side MIME + Size-Check
3. Server Action `uploadEmailAttachment(file, composeSessionId)` → Storage-Bucket
4. Optimistic UI: Anhang sofort in Liste, dann mit Storage-Path-Update
5. Loeschen → Storage-File entfernen + UI-Update

**Compose-Session-ID:**
- UUID beim Oeffnen des Composing-Studios
- Lebensdauer: bis Send oder Page-Reload
- Verwaiste Anhaenge bei Page-Reload ohne Send → Tech-Debt, kein V5.4-Cleanup-Cron (dokumentierter Folge-Slice)

**`send.ts`-Erweiterung:**
- `sendEmailWithTracking(opts)` bekommt optionalen `attachments`-Parameter (Default: `[]`)
- Bei Send: Storage-Files via service_role downloaden → Nodemailer `attachments`-Array → Multipart-Mail
- Nach erfolgreichem Versand: `email_attachments`-Junction-Rows persistieren mit FK zu `emails.id`
- `sendEmailWithTracking` ohne `attachments`-Parameter = bit-identisches V5.3-Verhalten (Cadences, Auto-Reply unbeeintraechtigt)

**Lifecycle:**
- File bleibt nach Versand im Storage-Bucket (Auditspur, Re-Send moeglich)
- Cleanup-Cron erst wenn Volumen-Druck (>5 GB) — naechster Mini-Slice

**Live-Preview-Indikator:**
- Im rechten Panel unterhalb der Body-Preview: Sektion "Anhaenge"
- Pro Anhang: Icon + Filename + Size
- Kein Inhalts-Render — nur Indikator wie der Empfaenger es sieht

**Tracking-Regression-Pflicht:**
- Smoke-Test mit Anhang-Mail an Gmail muss Tracking-Pixel-Event ausloesen
- Cadence-Engine ist nicht im V5.4-Scope (Cadences haben keine Anhang-UI), aber bestehender Cadence-Code-Pfad darf nicht brechen

## Acceptance Criteria
- AC1: Im Composing-Studio ist unterhalb der Body-Textarea ein Anhang-Bereich mit Drag&Drop-Zone und File-Picker-Button sichtbar.
- AC2: Drag&Drop einer Datei oder Klick auf File-Picker fuegt die Datei zur Anhang-Liste hinzu.
- AC3: Anhang-Liste zeigt pro File: Icon (MIME-basiert), Filename, Size, Loeschen-Button.
- AC4: MIME-Whitelist greift auf Browser-Ebene (verbotene Files koennen gar nicht erst hinzugefuegt werden) UND auf Server-Ebene (Server-Action lehnt ab mit klarer Fehlermeldung).
- AC5: Size-Limit 10 MB pro File und 25 MB Total wird Browser- und Server-seitig validiert.
- AC6: Loeschen eines Anhangs entfernt die Storage-Datei und nimmt sie aus der Anhang-Liste raus.
- AC7: Live-Preview rechts zeigt eine Anhang-Indikator-Sektion mit Icon + Filename + Size pro Anhang.
- AC8: "Senden" produziert eine Mail mit Multipart-Body, die in Gmail/Outlook mit den Anhaengen ankommt.
- AC9: Nach Versand existieren `email_attachments`-Junction-Rows mit FK zu `emails.id`. Storage-Files bleiben im Bucket.
- AC10: Tracking-Pixel-Event feuert bei Anhang-Mail mit Tracking-Pixel (Smoke-Test mit Gmail).
- AC11: `sendEmailWithTracking` ohne `attachments`-Parameter (Default leer) verhaelt sich bit-identisch zu V5.3 (Backwards Compatibility — Cadence-Engine + bestehende Send-Pfade unbeeintraechtigt).
- AC12: ZIP-Dateien werden akzeptiert ohne Inhalt-Inspection.

## Out of Scope
- Anhang-Auswahl aus dem System (Angebot anhaengen) — wartet auf BL-405 Angebot-Erstellung
- Anhang-Auswahl aus der bestehenden Document-Library (`documents`-Bucket) — keine V5.4-Anforderung
- Inhalt-Inspection von ZIP-Dateien (Server-side Unzip + MIME-Check pro File)
- Cron-Cleanup fuer Storage-Volume in `email-attachments`-Bucket
- Anhang-Re-Send aus Audit-Spur
- Drag&Drop-Reorder der Anhaenge
- Inline-Bilder im Body (Cid-References)
- Anhang-Versand in Cadences/Sequences
- Inbound-Anhaenge (Download von Anhaengen aus eingehenden IMAP-Mails) — anderes Thema, FEAT-405
- Verwaiste-Anhaenge-Cleanup-Cron bei Compose-Session-Abandon

## Dependencies
- FEAT-532 (Composing-Studio-UI: Compose-Form, Live-Preview)
- DEC-085 (Branding-Bucket-Pattern wiederverwenden)
- Self-Hosted Supabase Storage (existing Infra)
- Nodemailer `attachments`-Array Support (existing Lib)
- MIG-025 fuer Bucket + Junction-Table + Policies
