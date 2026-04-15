# SLC-411 — Consent-Schema + Public-Page (MIG-011 + FEAT-411)

## Slice Info
- Feature: FEAT-411 (auch MIG-011 Vollmigration fuer FEAT-404 + FEAT-409)
- Priority: Blocker
- Delivery Mode: internal-tool
- Backlog-Mapping: BL-344 (primaer)

## Goal
MIG-011 vollstaendig anwenden (contacts+7 inkl. opt_out_communication, meetings+11, user_settings neu, activities.ai_generated) und den DSGVO-Einwilligungsflow inkl. tokenisierter Public-Page `/consent/{token}`, Consent-Mail-Template, Kontakt-Workspace-UI, Audit-Log-Erweiterung und Rate-Limit/IP-Hash-Schutz (DEC-042) implementieren. Schliesst ISSUE-032 (Opt-out-Flag fuer FEAT-409 AC-5).

## Scope
- SQL-Migration MIG-011 (alle additiven Felder inkl. `contacts.opt_out_communication BOOLEAN DEFAULT false` + user_settings + RLS + Grants + Indizes)
- TypeScript-Types (Contact, Meeting, UserSettings, Activity) aktualisieren
- Server Actions: `createConsentRequest`, `grantConsent`, `declineConsent`, `revokeConsent` (public), `revokeConsentManual` (authed), `setOptOutCommunication` (authed)
- Public Routes: `app/consent/[token]/page.tsx`, `app/consent/[token]/revoke/page.tsx`, Bestaetigungs-Page `app/consent/[token]/confirmed/page.tsx`
- `middleware.ts`: Whitelist fuer `/consent/*`
- Rate-Limiter-Helper (`/lib/security/rate-limit.ts`, In-Memory, 100/IP/Stunde)
- IP-Hash-Helper (`/lib/security/ip-hash.ts`) + `CONSENT_DAILY_SALT` ENV
- Consent-Mail-Template `consent-request-de` (HTML + Plain)
- Kontakt-Workspace UI: Consent-Status-Badge + Datum + Quelle + Buttons "Einwilligung anfragen" / "Widerrufen" + Opt-out-Toggle (Kommunikation unterdruecken)
- Audit-Log-Action-Typen (`consent_requested`, `consent_granted`, `consent_declined`, `consent_revoked`, `communication_opt_out_changed`)
- Cron-Route `POST /api/cron/pending-consent-renewal` (Hinweis bei Pending >7 Tage, taeglich)

## Out of Scope
- Recording-/Transcript-/Summary-Nutzung (SLC-414/415/416)
- Meeting-Reminder-Cron (SLC-417)
- Bulk-Consent-Anfrage (V4.2+)
- Mehrsprachige Mails (nur DE in V4.1)

## Micro-Tasks

### MT-1: SQL-Migration MIG-011
- Goal: Vollstaendige additive Schema-Migration erstellen (alle 4 Tabellenaenderungen + Indizes + RLS user_settings). `contacts.opt_out_communication BOOLEAN DEFAULT false` ist Teil dieser Migration (schliesst ISSUE-032).
- Files: `cockpit/sql/11_v41_migration.sql`
- Expected behavior: SQL laeuft fehlerfrei auf Hetzner PostgreSQL via `docker exec ... psql -U postgres` (siehe sql-migration-hetzner.md)
- Verification: SQL-Dry-Run lokal mit Supabase CLI, manuelle Ausfuehrung auf Hetzner, `\d contacts` zeigt 7 neue Felder inkl. `opt_out_communication`, `\d meetings`, `\d user_settings`, `\d activities`
- Dependencies: none

### MT-2: TypeScript-Types
- Goal: Types fuer alle geaenderten Tabellen aktualisieren
- Files: `cockpit/src/types/contact.ts`, `cockpit/src/types/meeting.ts`, `cockpit/src/types/user-settings.ts` (neu), `cockpit/src/types/activity.ts`
- Expected behavior: Types matchen Schema exakt; `consent_status` als Union-Type `'pending' | 'granted' | 'declined' | 'revoked'`
- Verification: `npm run build` ohne Type-Fehler
- Dependencies: MT-1

### MT-3: Rate-Limit + IP-Hash + Middleware-Whitelist
- Goal: Security-Helper und Middleware fuer `/consent/*`
- Files: `cockpit/src/lib/security/rate-limit.ts`, `cockpit/src/lib/security/ip-hash.ts`, `cockpit/src/middleware.ts`
- Expected behavior: Unauthenticated access zu `/consent/*` funktioniert, IP-Hash nutzt `CONSENT_DAILY_SALT`, Rate-Limit 100/h
- Verification: curl ohne Session auf `/consent/test-token` gibt 200 (oder Not-Found), 101. Request gibt 429
- Dependencies: MT-1

### MT-4: Server Actions fuer Consent
- Goal: `createConsentRequest`, `grantConsent`, `declineConsent`, `revokeConsent` (public), `revokeConsentManual` (auth)
- Files: `cockpit/src/app/actions/consent.ts`
- Expected behavior: Token-Generierung via `crypto.randomBytes(32).toString('hex')`, Audit-Log-Inserts mit IP-Hash, Expiry-Check
- Verification: Unit-Logic-Check; End-to-End via Public-Page
- Dependencies: MT-3

### MT-5: Public-Consent-Pages
- Goal: 3 Pages — Zustimmen/Ablehnen, Widerrufen, Bestaetigung
- Files: `cockpit/src/app/consent/[token]/page.tsx`, `cockpit/src/app/consent/[token]/revoke/page.tsx`, `cockpit/src/app/consent/[token]/confirmed/page.tsx`
- Expected behavior: Server-side Token-Lookup, Anzeige von Kontakt-Name + DSGVO-Erklaerung, zwei Buttons, Bestaetigungsseite nach Klick
- Verification: Browser-Test mit generiertem Test-Token; Expired-Token zeigt "Link abgelaufen"
- Dependencies: MT-4

### MT-6: Consent-Mail-Template + SMTP-Versand
- Goal: DSGVO-konformes deutsches Template, Versand via bestehende SMTP-Infrastruktur
- Files: `cockpit/src/lib/email/templates/consent-request-de.ts`, `cockpit/src/lib/email/send-consent-mail.ts`
- Expected behavior: Mail enthaelt personalisierten Link, Widerruf-Hinweis, Datenschutz-Platzhalter
- Verification: Test-Versand an eigene Adresse (IONOS), visuelle Pruefung in Gmail + Outlook
- Dependencies: MT-4

### MT-7: Kontakt-Workspace UI
- Goal: Consent-Status + Kommunikations-Opt-out im Kontakt-Detail sichtbar + Aktions-Buttons
- Files: `cockpit/src/components/contacts/ConsentBadge.tsx`, `cockpit/src/components/contacts/ConsentActions.tsx`, `cockpit/src/components/contacts/OptOutToggle.tsx`, Integration in `cockpit/src/app/contacts/[id]/page.tsx`
- Expected behavior: Badge zeigt Consent-Status mit Farb-Coding, Datum + Quelle, Buttons "Anfragen"/"Widerrufen"; separater Toggle "Keine Kommunikation senden" (schreibt `opt_out_communication`, Audit-Log `communication_opt_out_changed`)
- Verification: Klick-Test durch alle Consent-Status-Uebergaenge, Reminder-Hinweis bei Pending >7d sichtbar, Opt-out-Toggle aktiviert/deaktiviert und Reminder-Cron (SLC-417) respektiert das Flag
- Dependencies: MT-4

### MT-8: Cron `pending-consent-renewal`
- Goal: Taeglicher Cron, der Kontakte mit Pending >7d markiert (fuer UI-Hinweis oder spaeteren Re-Send)
- Files: `cockpit/src/app/api/cron/pending-consent-renewal/route.ts`
- Expected behavior: CRON_SECRET-Schutz, Logt Count, keine Mutations in V4.1 (nur Flag fuer UI)
- Verification: Manueller Call via curl + Header; Log-Check
- Dependencies: MT-1

## Acceptance Criteria
1. MIG-011 komplett auf Hetzner angewendet (`\d` zeigt alle neuen Felder inkl. `contacts.opt_out_communication`, `user_settings` existiert, RLS aktiv)
2. `/consent/{token}` ist oeffentlich erreichbar ohne Login, Middleware-Whitelist aktiv
3. Token-Generierung kryptografisch (32-byte hex), Expiry nach 30 Tagen wirkt
4. Grant/Decline/Revoke-Server-Actions schreiben `audit_log`-Eintrag mit `ip_hash` + `user_agent_hash`
5. Consent-Mail-Versand funktioniert (IONOS-SMTP), Link fuehrt zur Public-Page
6. Kontakt-Workspace zeigt Status-Badge + Aktions-Buttons, alle 4 Status-Uebergaenge funktional
7. Opt-out-Toggle am Kontakt setzt `opt_out_communication`, Audit-Log-Eintrag `communication_opt_out_changed` vorhanden
8. Rate-Limit 100/IP/Stunde greift (getestet mit curl-Schleife)
9. Bestand-Kontakte haben nach Migration `consent_status = 'pending'` und `opt_out_communication = false`
10. Pending-Renewal-Cron laeuft und loggt Count korrekt

## Dependencies
Keine. Additiver Schema-Slice, blockiert aber SLC-414 und SLC-416 (Consent-Check vor Recording).

## QA Focus
- **Security:** Public-Page nicht ueber Middleware umgehbar fuer andere Routes. Rate-Limit wirksam. Token nach Grant invalidiert.
- **DSGVO:** Audit-Log-Eintraege vollstaendig, IP-Hash statt Plain-IP, Daily-Salt rotiert.
- **UI:** Consent-Status-Badge klar erkennbar in Deal-Workspace (wenn Kontakt verknuepft).
- **Migration:** RLS auf `user_settings` verhindert Fremdzugriff.
- **Build + Types:** `npm run build` und `npm run test` (wenn vorhanden) ohne Fehler.

## Geschaetzter Aufwand
1.5 Tage (Migration + Public-Page + UI)
