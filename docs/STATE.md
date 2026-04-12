# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: requirements
- Current Focus: V4 Requirements abgeschlossen — naechster Schritt /architecture
- Current Phase: V4 Planung

## Immediate Next Steps
1. /architecture fuer V4 (Infrastruktur: IMAP-Sync, Cal.com Docker, ai_action_queue, Server-Sizing)
2. /slice-planning fuer V4 (6 Features in Slices zerlegen)

## Active Scope
V4 — KI-Gatekeeper + Externe Integrationen (6 Features):
- FEAT-405: IMAP Mail-Integration (IONOS direkt)
- FEAT-408: KI-Gatekeeper (E-Mail-Analyse + Klassifikation)
- FEAT-410: KI-Kontextanalyse (Auto-Replies)
- FEAT-407: KI-Wiedervorlagen mit Freigabe
- FEAT-406: Cal.com-Sync + Gesamtkalender
- FEAT-403: Management-Cockpit LLM-Ausbau

## Blockers
- aktuell keine

## Last Stable Version
- V3.3 — 2026-04-11 — deployed auf Hetzner (UI-Abrundung + Visualisierung, 6/6 Slices, REL-008)

## Notes
V4 Requirements abgeschlossen (2026-04-12). V4/V4.1 Scope-Split: V4 = KI-Gatekeeper + Kalender (6 Features), V4.1 = Meeting-Intelligence + Wissensschicht (4 Features). Neue Decisions: DEC-030 (IONOS IMAP direkt), DEC-031 (Self-Hosted Everything), DEC-032 (V4/V4.1 Split). V4 Infrastruktur: IONOS IMAP, Cal.com Self-Hosted (Hetzner Docker), Bedrock Frankfurt. Server-Upgrade bei Bedarf (CPX32 → CPX42/52).
