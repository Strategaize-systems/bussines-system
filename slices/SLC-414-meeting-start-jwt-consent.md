# SLC-414 — Meeting-Start + Jitsi-JWT + Consent-Check

## Slice Info
- Feature: FEAT-404 (Core)
- Priority: High
- Delivery Mode: internal-tool
- Backlog-Mapping: BL-201 (Teil), BL-205 (Teil)

## Goal
Brueckenschlag zwischen Deal-Workspace und Jitsi: User klickt "Meeting starten" → Server erzeugt Meeting-Row, generiert `jitsi_room_name`, prueft Consent aller Teilnehmer, baut **pro Teilnehmer einen JWT** fuer Jitsi (Host als `moderator=true`, Externe als `moderator=false`), sendet Einladungen mit individuellem JWT-Link an externe Teilnehmer, redirect in den Jitsi-Raum. Recording wird automatisch getriggert, wenn alle Teilnehmer `consent_status='granted'` haben. Schliesst ISSUE-031 (JWT-fuer-Externe).

## Scope
- `POST /api/meetings/[id]/start` Route
- Server Action `startMeeting(dealId, contactIds[])` fuer Deal-Workspace-Button
- JWT-Builder via `jsonwebtoken` (HS256, `JITSI_JWT_APP_SECRET`), unterstuetzt 2 Varianten: Moderator-JWT (Host, `moderator=true`) und Participant-JWT (extern, `moderator=false`)
- Pro Teilnehmer ein individueller JWT mit `sub=contactId|hostUserId`, `exp=meeting_scheduled_at + 6h` (Tolerance fuer Late-Join)
- Consent-Check-Helper `checkConsentStatus(contactIds)` → `{ allGranted: boolean, missing: Contact[] }`
- Ad-hoc-Auto-Contact-Logik (DEC-044): unbekannte E-Mails → `INSERT contacts ... consent_status='pending', consent_source='ad_hoc'`
- Deal-Workspace UI: Button "Meeting starten" + Modal (Teilnehmer-Auswahl + Start-Button) + Banner "Aufzeichnung deaktiviert" bei fehlendem Consent
- `meetings.jitsi_room_name` wird auf `deal-{dealId}-{ts}` gesetzt
- Einladungs-E-Mails mit individuellem Meeting-Link `meet.strategaizetransition.com/{room}?jwt={participant-jwt}` (kein .ics hier — das kommt in SLC-417 zusammen mit Reminder; hier reicht simple Invite mit JWT-Link)
- Audit-Log-Eintrag `meeting_started` (User als actor) + `jwt_issued` pro ausgegebenem Token

## Out of Scope
- .ics-Attachment (SLC-417)
- Reminder-Mails (SLC-417)
- Recording-Upload-Cron (SLC-415)
- Transkript + Summary (SLC-416)
- Jitsi-Lobby / Wartezimmer
- Externer Gaeste-Link ohne Consent-Popup im Meeting

## Micro-Tasks

### MT-1: JWT-Builder + ENV (Moderator + Participant)
- Goal: Modul `/lib/meetings/jitsi-jwt.ts` mit 2 Funktionen: `buildModeratorJwt(userId, room)` und `buildParticipantJwt(contactId, room, displayName, meetingExpiresAt)`
- Files: `cockpit/src/lib/meetings/jitsi-jwt.ts`, `cockpit/package.json` (jsonwebtoken ^9 falls fehlt)
- Expected behavior: Beide signieren mit `JITSI_JWT_APP_SECRET` (HS256). Claims: `{aud=JITSI_JWT_APP_ID, iss=JITSI_JWT_APP_ID, sub=JITSI_XMPP_DOMAIN, room, context: {user: {id, name, email?}}, moderator, exp}`. Moderator-JWT: `moderator=true`. Participant-JWT: `moderator=false`, `exp=scheduled_at + 6h`.
- Verification: Unit-Test prueft beide Varianten, Decode zeigt erwartete Claims, moderator-Unterscheidung korrekt, ungueltiger Token wird abgelehnt
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
- Expected behavior: Legt meetings-Row an (falls noch nicht), `jitsi_room_name` gesetzt, Consent gecheckt, **pro Teilnehmer JWT erzeugt** (Host = Moderator-JWT, Externe = Participant-JWT), Einladungen mit individuellem `?jwt=<token>`-Link versendet, Host-Redirect-URL mit Moderator-JWT zurueckgegeben, Audit-Log-Eintrag `jwt_issued` pro Token
- Verification: Postman/curl-Test, Response enthaelt `host_redirect_url` (mit Moderator-JWT) + `recording_enabled` Flag; Einladungs-Mails im Test-Postfach enthalten jeweils individuellen JWT-Link
- Dependencies: MT-1, MT-2, MT-3

### MT-5: Einladungs-Mail mit individuellem JWT-Link (ohne .ics)
- Goal: SMTP-Mail an externe Teilnehmer mit personalisiertem Jitsi-Link (`?jwt=<participant-jwt>`)
- Files: `cockpit/src/lib/email/templates/meeting-invite-basic-de.ts`, `cockpit/src/lib/meetings/send-invite.ts`
- Expected behavior: Pro externem Teilnehmer ein Participant-JWT via MT-1, eingebettet in Meeting-URL `meet.strategaizetransition.com/{room}?jwt={token}`. HTML + Plain, jeder Empfaenger erhaelt seinen eigenen Link (kein Shared-JWT). `opt_out_communication=true`-Kontakte werden nicht versendet.
- Verification: Test-Versand an zwei verschiedene Test-Adressen, beide Links funktionieren in Jitsi, Links sind verschieden; Kontakt mit Opt-out erhaelt keine Mail
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
1. Klick auf "Meeting starten" im Deal-Workspace oeffnet Jitsi-Raum in neuem Tab (authentifiziert via Moderator-JWT fuer Host)
2. `jitsi_room_name` wird im Format `deal-{dealId}-{ts}` erzeugt und in `meetings` gespeichert
3. Wenn alle Teilnehmer `consent_status='granted'`: Recording wird automatisch gestartet (Jitsi-Bot-Config)
4. Wenn mind. ein Teilnehmer nicht `granted`: Banner "Aufzeichnung deaktiviert" mit Liste der Namen
5. Ad-hoc-Teilnehmer (E-Mail nicht in `contacts`) werden automatisch angelegt mit `consent_source='ad_hoc'`
6. Externe Teilnehmer erhalten E-Mail mit **individuellem** Meeting-Link inkl. eigenem Participant-JWT (`moderator=false`)
7. Jeder ausgegebene JWT generiert Audit-Log `jwt_issued`, Meeting-Start erzeugt `meeting_started`
8. JWT-Ablauf = `scheduled_at + 6h` (Late-Join-Tolerance), abgelaufener Token wird von Jitsi abgelehnt
9. Kontakte mit `opt_out_communication=true` erhalten keine Einladung
10. `POST /api/meetings/[id]/start` ist authentifiziert, keine Public-Route

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
