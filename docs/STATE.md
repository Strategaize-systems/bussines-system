# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: implementing
- Current Focus: SLC-418 done (Browser-Push + Service Worker: web-push, SW, PushSubscribeButton, subscribe API, push helper, cron push-first/SMTP-fallback, iOS hint). Naechster Schritt: /qa SLC-418, dann /backend SLC-419.
- Current Phase: V4.1 Implementation (SLC-411..418 done, 1 slice remaining)

## Immediate Next Steps
1. /qa SLC-418 — Browser-Push + Service Worker (SW-Registration, Push-Permission, Subscription-API, Cron Push/SMTP-Fallback, iOS-Hint, 410-Cleanup)
2. /backend SLC-419 — KI-Agenda (on-click + auto)
3. Gesamt-QA V4.1 nach SLC-419
3. V4-Nachzug parallel: Cal.com Admin-Password staerken (15+ Zeichen + 2FA), Live-Testbuchung — kein V4.1-Blocker
4. VAPID_SUBJECT in Coolify auf immo@bellaerts.de umstellen (steht auf nicht-existentem admin@...) — kein V4.1-Blocker
5. Vor Server-Reboot: `apt install linux-modules-extra-$(uname -r)` fuer kommenden Kernel 6.8.0-107 (ISSUE-037) — sonst bricht Jibri nach Reboot

## Active Scope
**V4.1 — Meeting Intelligence Basis (active, Architecture done):**
- FEAT-404 Call Intelligence (Jitsi + Jibri + Whisper + Bedrock-Summary)
- FEAT-409 Meeting-Erinnerungen (extern + intern + KI-Agenda)
- FEAT-411 DSGVO-Einwilligungsflow (einmalig, widerrufbar)

Kern-Design-Entscheidungen: Whisper-Adapter-Pattern (DEC-035), Jitsi shared-infrastructure (DEC-036), Queue nur schreibend (DEC-037, V4.3), Einwilligung einmalig (DEC-038), V4.x Scope-Split (DEC-039), Jitsi Co-Location auf CPX32 (DEC-040), Whisper-Adapter als Library (DEC-041), /consent/{token} Public-URL (DEC-042), Recording-Retention 30d ENV-konfigurierbar (DEC-043), Ad-hoc-Kontakte auto-Anlage (DEC-044), Jibri MP4 Default (DEC-045).

**V4.2 — Wissensbasis (planned):** FEAT-401 Cross-Source (nach V4.1 stabil).
**V4.3 — Insight Governance (planned):** FEAT-402 Queue (nach V4.2 stabil).

## Blockers
- aktuell keine (ISSUE-031 + ISSUE-032 durch Slice-Record-Updates 2026-04-15 resolved)

## Last Stable Version
- V4 — 2026-04-14 — deployed auf Hetzner (KI-Gatekeeper + Externe Integrationen, 9/9 Slices, REL-009)

## Notes
V4 Deployment in zwei Phasen: SLC-401..403 am 2026-04-12 (IMAP live), SLC-404..409 am 2026-04-14 abends (Redeploy). Smoke-Tests am 2026-04-15 morgen durchgelaufen: Login, IMAP-Inbox, Mein Tag KI-Wiedervorlagen, Gesamtkalender, KI-Analyse Cockpit, Focus 2-Spalten-Layout — alle PASS. Cal.com Self-Hosted läuft seit 2026-04-13 mit Webhook-Integration. CALCOM_API_KEY bewusst leer (AGPLv3). Bedrock Claude Sonnet 4 via Frankfurt-Region.

V4.1 Requirements am 2026-04-15 erstellt: PRD erweitert, 5 neue DECs (DEC-035..039), 3 Feature-Specs (FEAT-404, FEAT-409, FEAT-411), roadmap.json mit V4.2 + V4.3 ergaenzt, backlog.json um BL-342..351 erweitert. Prinzip "wenn wir es machen, machen wir es richtig" — deshalb V4.x-Split statt einer grossen Version.

V4.1 Architecture am 2026-04-15 erstellt: ARCHITECTURE.md um ~420 Zeilen V4.1-Block erweitert (Jitsi-Stack, Recording-Pipeline, Whisper-Adapter-Layer, DSGVO-Consent-Flow, Reminder-Pipeline, Docker-Compose-Aenderungen, Env-Vars, Sizing, Risk-Matrix). 6 neue DECs (DEC-040 Jitsi-CPX32-Sizing, DEC-041 Library-Adapter, DEC-042 /consent-URL, DEC-043 ENV-Retention, DEC-044 Ad-hoc-Kontakte, DEC-045 MP4-Format). MIG-011 Schema-Migration geplant (user_settings-Tabelle neu, contacts+6, meetings+11, activities.ai_generated). 9 Slices empfohlen fuer Implementierung.

V4.1 Slice-Planning am 2026-04-15 abgeschlossen: 9 Slice-Dateien erstellt (SLC-411 Consent-Schema + Public-Page, SLC-412 Jitsi+Jibri Deployment, SLC-413 Whisper-Adapter-Layer, SLC-414 Meeting-Start + JWT + Consent-Check, SLC-415 Recording-Upload + Retention, SLC-416 Transkript + Summary-Pipeline, SLC-417 user_settings + Reminder-Cron + .ics, SLC-418 Browser-Push + Service Worker, SLC-419 KI-Agenda). Jeder Slice mit Micro-Tasks (MT-1..N), Acceptance Criteria, Dependencies, QA-Fokus und Aufwandsschaetzung. Gesamt-Aufwandsschaetzung V4.1: ~13-15 Entwicklungstage. SLC-411 = Blocker-Schema (MIG-011 vollstaendig), SLC-412 = schwerster Infra-Slice mit Firewall/Subdomain-Vorarbeit. Pre-Slice-Checks (Hetzner-Firewall 10000/udp, Coolify-Subdomain, VAPID-Keys, Supabase-Bucket) sind vor SLC-412-Start zu erledigen. MIG-011 wurde vollstaendig in SLC-411 konsolidiert (alle additiven Schema-Aenderungen in einer Migration, analog zu V4/SLC-401 Precedent).

SLC-411 am 2026-04-16 implementiert: MIG-011 via sql/13_v41_migration.sql auf Hetzner angewendet (ALTER auf contacts/meetings/activities, user_settings neu, audit_log.actor_id nullable). Alle 8 Micro-Tasks erledigt: Rate-Limit + IP-Hash-Helper, Middleware-Whitelist fuer /consent, Consent Server Actions (create/grant/decline/revoke manual+public, setOptOutCommunication), 3 Public-Consent-Pages (grant/decline/revoke/confirmed) mit Client-Forms, DE-Consent-Mail-Template + SMTP-Versand, Kontakt-Workspace UI (ConsentBadge + ConsentActions + OptOutToggle), Pending-Renewal-Cron (taeglich, nur Zaehler). `npm run build` gruen. Noch offen: /qa, Browser-Smoke-Test mit echtem Token + SMTP-Versand.
