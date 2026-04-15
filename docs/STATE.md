# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: architecture
- Current Focus: V4.1 Architecture abgeschlossen (Meeting Intelligence Basis). 6 neue DECs (DEC-040..045), MIG-011 vorbereitet, 9 Slices empfohlen. Naechster Schritt /slice-planning zur detaillierten Ausarbeitung der V4.1-Slices.
- Current Phase: V4.1 Architecture done

## Immediate Next Steps
1. `/slice-planning` fuer V4.1 starten — 9 empfohlene Slices (SLC-411 Consent-Schema bis SLC-419 KI-Agenda) detaillieren
2. Danach pro Slice: `/backend` oder `/frontend` + `/qa`
3. V4-Nachzug: Cal.com Admin-Password staerken (15+ Zeichen + 2FA) — separat, kein V4.1-Blocker

## Active Scope
**V4.1 — Meeting Intelligence Basis (active, Architecture done):**
- FEAT-404 Call Intelligence (Jitsi + Jibri + Whisper + Bedrock-Summary)
- FEAT-409 Meeting-Erinnerungen (extern + intern + KI-Agenda)
- FEAT-411 DSGVO-Einwilligungsflow (einmalig, widerrufbar)

Kern-Design-Entscheidungen: Whisper-Adapter-Pattern (DEC-035), Jitsi shared-infrastructure (DEC-036), Queue nur schreibend (DEC-037, V4.3), Einwilligung einmalig (DEC-038), V4.x Scope-Split (DEC-039), Jitsi Co-Location auf CPX32 (DEC-040), Whisper-Adapter als Library (DEC-041), /consent/{token} Public-URL (DEC-042), Recording-Retention 30d ENV-konfigurierbar (DEC-043), Ad-hoc-Kontakte auto-Anlage (DEC-044), Jibri MP4 Default (DEC-045).

**V4.2 — Wissensbasis (planned):** FEAT-401 Cross-Source (nach V4.1 stabil).
**V4.3 — Insight Governance (planned):** FEAT-402 Queue (nach V4.2 stabil).

## Blockers
- aktuell keine

## Last Stable Version
- V4 — 2026-04-14 — deployed auf Hetzner (KI-Gatekeeper + Externe Integrationen, 9/9 Slices, REL-009)

## Notes
V4 Deployment in zwei Phasen: SLC-401..403 am 2026-04-12 (IMAP live), SLC-404..409 am 2026-04-14 abends (Redeploy). Smoke-Tests am 2026-04-15 morgen durchgelaufen: Login, IMAP-Inbox, Mein Tag KI-Wiedervorlagen, Gesamtkalender, KI-Analyse Cockpit, Focus 2-Spalten-Layout — alle PASS. Cal.com Self-Hosted läuft seit 2026-04-13 mit Webhook-Integration. CALCOM_API_KEY bewusst leer (AGPLv3). Bedrock Claude Sonnet 4 via Frankfurt-Region.

V4.1 Requirements am 2026-04-15 erstellt: PRD erweitert, 5 neue DECs (DEC-035..039), 3 Feature-Specs (FEAT-404, FEAT-409, FEAT-411), roadmap.json mit V4.2 + V4.3 ergaenzt, backlog.json um BL-342..351 erweitert. Prinzip "wenn wir es machen, machen wir es richtig" — deshalb V4.x-Split statt einer grossen Version.

V4.1 Architecture am 2026-04-15 erstellt: ARCHITECTURE.md um ~420 Zeilen V4.1-Block erweitert (Jitsi-Stack, Recording-Pipeline, Whisper-Adapter-Layer, DSGVO-Consent-Flow, Reminder-Pipeline, Docker-Compose-Aenderungen, Env-Vars, Sizing, Risk-Matrix). 6 neue DECs (DEC-040 Jitsi-CPX32-Sizing, DEC-041 Library-Adapter, DEC-042 /consent-URL, DEC-043 ENV-Retention, DEC-044 Ad-hoc-Kontakte, DEC-045 MP4-Format). MIG-011 Schema-Migration geplant (user_settings-Tabelle neu, contacts+6, meetings+11, activities.ai_generated). 9 Slices empfohlen fuer Implementierung.
