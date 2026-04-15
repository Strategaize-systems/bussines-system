# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: requirements
- Current Focus: V4.1 Requirements abgeschlossen (Meeting Intelligence Basis). Naechster Schritt /architecture fuer Jitsi/Jibri-Infrastruktur, Whisper-Adapter-Layer, Schema-Erweiterungen (consent, recording).
- Current Phase: V4.1 Requirements done

## Immediate Next Steps
1. `/architecture` fuer V4.1 starten — Jitsi+Jibri Deployment, Whisper-Adapter-Interface, Consent-Schema, Meeting-Reminder-Cron
2. Nach /architecture: `/slice-planning` fuer V4.1 (geschaetzt 8-10 Slices)
3. V4-Nachzug: Cal.com Admin-Password staerken (15+ Zeichen + 2FA) — separat, kein V4.1-Blocker

## Active Scope
**V4.1 — Meeting Intelligence Basis (active, Requirements done):**
- FEAT-404 Call Intelligence (Jitsi + Jibri + Whisper + Bedrock-Summary)
- FEAT-409 Meeting-Erinnerungen (extern + intern + KI-Agenda)
- FEAT-411 DSGVO-Einwilligungsflow (einmalig, widerrufbar)

Kern-Design-Entscheidungen: Whisper-Adapter-Pattern (DEC-035), Jitsi shared-infrastructure (DEC-036), Queue nur schreibend (DEC-037, V4.3), Einwilligung einmalig (DEC-038), V4.x Scope-Split (DEC-039).

**V4.2 — Wissensbasis (planned):** FEAT-401 Cross-Source (nach V4.1 stabil).
**V4.3 — Insight Governance (planned):** FEAT-402 Queue (nach V4.2 stabil).

## Blockers
- aktuell keine

## Last Stable Version
- V4 — 2026-04-14 — deployed auf Hetzner (KI-Gatekeeper + Externe Integrationen, 9/9 Slices, REL-009)

## Notes
V4 Deployment in zwei Phasen: SLC-401..403 am 2026-04-12 (IMAP live), SLC-404..409 am 2026-04-14 abends (Redeploy). Smoke-Tests am 2026-04-15 morgen durchgelaufen: Login, IMAP-Inbox, Mein Tag KI-Wiedervorlagen, Gesamtkalender, KI-Analyse Cockpit, Focus 2-Spalten-Layout — alle PASS. Cal.com Self-Hosted läuft seit 2026-04-13 mit Webhook-Integration. CALCOM_API_KEY bewusst leer (AGPLv3). Bedrock Claude Sonnet 4 via Frankfurt-Region.

V4.1 Requirements am 2026-04-15 erstellt: PRD erweitert, 5 neue DECs (DEC-035..039), 3 Feature-Specs (FEAT-404, FEAT-409, FEAT-411), roadmap.json mit V4.2 + V4.3 ergaenzt, backlog.json um BL-342..351 erweitert. Prinzip "wenn wir es machen, machen wir es richtig" — deshalb V4.x-Split statt einer grossen Version.
