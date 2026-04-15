# SLC-414 — Meeting-Start + Jitsi-JWT + Consent-Check

## Slice Info
- Feature: FEAT-404 (Core)
- Priority: High
- Delivery Mode: internal-tool
- Backlog-Mapping: BL-201 (Teil), BL-205 (Teil)

## Goal
Brueckenschlag zwischen Deal-Workspace und Jitsi: User klickt "Meeting starten" → Server erzeugt Meeting-Row, generiert `jitsi_room_name`, prueft Consent aller Teilnehmer, baut JWT fuer Jitsi (tenant=business), sendet Einladungen + .ics an externe Teilnehmer, redirect in den Jitsi-Raum. Recording wird automatisch getriggert, wenn alle Teilnehmer `consent_status='granted'` haben.

## Scope
- `POST /api/meetings/[id]/start` Route
- Server Action `startMeeting(dealId, contactIds[])` fuer Deal-Workspace-Button
- JWT-Builder via `jsonwebtoken` (HS256, `JITSI_JWT_APP_SECRET`)
- Consent-Check-Helper `checkConsentStatus(contactIds)` → `{ allGranted: boolean, missing: Contact[] }`
- Ad-hoc-Auto-Contact-Logik (DEC-044): unbekannte E-Mails → `INSERT contacts ... consent_status='pending', consent_source='ad_hoc'`
- Deal-Workspace UI: Button "Meeting starten" + Modal (Teilnehmer-Auswahl + Start-Button) + Banner "Aufzeichnung deaktiviert" bei fehlendem Consent
- `meetings.jitsi_room_name` wird auf `deal-{dealId}-{ts}` gesetzt
- Einladungs-E-Mails mit Meeting-Link (kein .ics hier — das kommt in SLC-417 zusammen mit Reminder; hier reicht simple Invite)
- Audit-Log-Eintrag `meeting_started` (User als actor)

## Out of Scope
- .ics-Attachment (SLC-417)
- Reminder-Mails (SLC-417)
- Recording-Upload-Cron (SLC-415)
- Transkript + Summary (SLC-416)
- Jitsi-Lobby / Wartezimmer
- Externer Gaeste-Link ohne Consent-Popup im Meeting

## Micro-Tasks

### MT-1: JWT-Builder + ENV
- Goal: Modul `/lib/meetings/jitsi-jwt.ts` mit `buildJitsiJwt(params)`
- Files: `cockpit/src/lib/meetings/jitsi-jwt.ts`, `cockpit/package.json` (jsonwebtoken ^9 falls fehlt)
- Expected behavior: Signiert JWT mit `JITSI_JWT_APP_SECRET`, Claims `{aud, iss, sub, room, moderator, exp}`
- Verification: Unit-Test mit festem Secret liefert erwartbaren Token, Decode klappt
- Dependencies: none

### MT-2: Consent-Check-Helper
- Goal: Helper prueft alle Teilnehmer, liefert Ergebnis + fehlende Kontakte
- Files: `cockpit/src/lib/meetings/consent-check.ts`
- Expected behavior: Query nach `consent_status='granted'` fuer alle Contact-IDs; liefert `{ allGranted, missing }`
- Verification: Unit-Test mit gemischten Status
- Dependencies: MT-1 (technisch nicht, aber thematisch)

### MT-3: Ad-hoc-Contact-Creation
- Goal: Funktion `ensureContactsForEmails(emails)` legt unbekannte Kontakte auto an (DEC-044)
- Files: `cockpit/src/lib/meetings/ad-hoc-contacts.ts`
- Expected behavior: Vorhandene Kontakte werden zurueckgegeben; unbekannte Emails → INSERT contacts mit `consent_source='ad_hoc'`, `consent_status='pending'`
- Verification: Unit-Test mit Mix aus bekannt/unbekannt
- Dependencies: MT-2

### MT-4: API-Route + Server Action
- Goal: `POST /api/meetings/[id]/start` + `startMeeting` Server Action
- Files: `cockpit/src/app/api/meetings/[id]/start/route.ts`, `cockpit/src/app/actions/meetings.ts`
- Expected behavior: Legt meetings-Row an (falls noch nicht), `jitsi_room_name` gesetzt, Consent gecheckt, JWT gebaut, Einladungen versendet, Redirect-URL zurueck
- Verification: Postman/curl-Test, Response enthaelt `redirect_url` + `recording_enabled` Flag
- Dependencies: MT-1, MT-2, MT-3

### MT-5: Einfache Einladungs-Mail (ohne .ics)
- Goal: SMTP-Mail an externe Teilnehmer mit Meeting-Link
- Files: `cockpit/src/lib/email/templates/meeting-invite-basic-de.ts`, `cockpit/src/lib/meetings/send-invite.ts`
- Expected behavior: HTML + Plain, enthaelt Jitsi-Link (ohne JWT im Link — Token in URL vom Empfaenger nicht erwartbar, kommt separater Flow; V4.1: nur internal host generiert JWT, externe klicken Standard-Jitsi-Link und sehen Meeting-ID)
- Verification: Test-Versand an eigene Adresse
- Dependencies: MT-4

### MT-6: Deal-Workspace UI
- Goal: Button + Modal + Banner
- Files: `cockpit/src/components/deals/StartMeetingButton.tsx`, `cockpit/src/components/deals/StartMeetingModal.tsx`, Integration in `cockpit/src/app/deals/[id]/page.tsx`
- Expected behavior: Button sichtbar wenn Deal Kontakte hat, Modal zeigt Teilnehmer-Checkboxen, Banner rot bei fehlendem Consent mit Namen
- Verification: Klick-Test, Meeting startet in neuem Tab
- Dependencies: MT-4

### MT-7: Mein-Tag Einstiegspunkt (ergaenzend)
- Goal: "Meeting starten"-Button auch auf Mein Tag (bei heutigem geplanten Meeting)
- Files: `cockpit/src/components/mein-tag/MeetingQuickStart.tsx`
- Expected behavior: Ruft gleichen Server Action auf
- Verification: Klick-Test
- Dependencies: MT-6

## Acceptance Criteria
1. Klick auf "Meeting starten" im Deal-Workspace oeffnet Jitsi-Raum in neuem Tab (authentifiziert via JWT)
2. `jitsi_room_name` wird im Format `deal-{dealId}-{ts}` erzeugt und in `meetings` gespeichert
3. Wenn alle Teilnehmer `consent_status='granted'`: Recording wird automatisch gestartet (Jitsi-Bot-Config)
4. Wenn mind. ein Teilnehmer nicht `granted`: Banner "Aufzeichnung deaktiviert" mit Liste der Namen
5. Ad-hoc-Teilnehmer (E-Mail nicht in `contacts`) werden automatisch angelegt mit `consent_source='ad_hoc'`
6. Externe Teilnehmer erhalten E-Mail mit Meeting-Link
7. JWT-Ablauf passend (24h z.B.), Audit-Log-Eintrag `meeting_started` vorhanden
8. `POST /api/meetings/[id]/start` ist authentifiziert, keine Public-Route

## Dependencies
- SLC-411 (Consent-Schema + contacts-Felder)
- SLC-412 (Jitsi-Infra lauffaehig, JWT-Config aktiv)

## QA Focus
- **Security:** JWT signiert mit HS256, Secret nicht im Client-Bundle, Expiry enforced
- **Consent-Logik:** Ad-hoc-Logik erzeugt keinen Duplicate-Kontakt, Consent-Check echt (nicht optimistic)
- **UX:** Fehlender-Consent-Banner klar, Namen statt nur E-Mails
- **Idempotenz:** Wenn Meeting schon existiert: kein neuer meetings-Row, existierenden re-öffnen
- **Edge-Cases:** Meeting ohne Kontakte (nur User) → Recording erlaubt (nur User selbst → trivial granted)
- **Build + Tests:** `npm run build` gruen, neue Unit-Tests laufen

## Geschaetzter Aufwand
2 Tage (UI + Server + Integration)
