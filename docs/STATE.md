# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: stable
- Current Focus: V4 released + live, Smoke-Tests PASS. Warten auf Live-Nutzung + erste echte Cal.com-Buchung fuer Webhook-Signatur-Verifikation.
- Current Phase: Post-Release V4

## Immediate Next Steps
1. Cal.com Live-Buchung (Testbuchung auf eigene Booking-Page) → Webhook-Signatur verifizieren
2. calcom-sync Cron in Coolify auf Active: No (AGPLv3 = kein API-Key, ist No-Op)
3. Cal.com Admin-Password stärken (15+ Zeichen + 2FA)
4. V4.1 Planung starten (Meeting-Intelligence: Jitsi + Whisper + Wissensbasis)

## Active Scope
V4 released — 6 Features, 9 Slices, alle deployed.
Nächste Version V4.1 (planned): FEAT-401 Wissensbasis, FEAT-402 Insight-Review-Queue, FEAT-404 Call Intelligence, FEAT-409 Meeting-Erinnerungen.

## Blockers
- aktuell keine

## Last Stable Version
- V4 — 2026-04-14 — deployed auf Hetzner (KI-Gatekeeper + Externe Integrationen, 9/9 Slices, REL-009)

## Notes
V4 Deployment in zwei Phasen: SLC-401..403 am 2026-04-12 (IMAP live), SLC-404..409 am 2026-04-14 abends (Redeploy). Smoke-Tests am 2026-04-15 morgen durchgelaufen: Login, IMAP-Inbox, Mein Tag KI-Wiedervorlagen, Gesamtkalender, KI-Analyse Cockpit, Focus 2-Spalten-Layout — alle PASS. Cal.com Self-Hosted läuft seit 2026-04-13 mit Webhook-Integration. CALCOM_API_KEY bewusst leer (AGPLv3). Bedrock Claude Sonnet 4 via Frankfurt-Region.
