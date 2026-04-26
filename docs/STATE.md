# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: requirements
- Current Focus: V5.3 E-Mail Composing Studio Requirements abgeschlossen 2026-04-26. BL-386 in 4 Features geschnitten: FEAT-531 Branding-Settings + Mail-Layout-Engine, FEAT-532 3-Panel-Composing-Studio (`/emails/compose`), FEAT-533 Systemvorlagen + KI-Vorlagen-Generator, FEAT-534 Inline-Edit-Diktat. PRD-Block, 4 FEAT-Specs, INDEX, roadmap (V5.3 active), backlog (BL-386 in_progress) aktualisiert. V5.2 bleibt Post-Launch stable. Pre-Pflichten zur V5.2 (ISSUE-042 OpenAI-Key-Rotation, Anwalts-Pruefung COMPLIANCE.md, Azure-EU-Whisper-Switch) bleiben offen — unabhaengig von V5.3-Arbeit. Naechster Schritt: /architecture V5.3.
- Current Phase: V5.3 Requirements done — bereit fuer /architecture. V5.2 Post-Launch confirmed stable (RPT-219, 4h Live-Beobachtung 2026-04-26). Internal-Test-Mode bleibt aktiv bis Anwalts-Pruefung + Azure-EU-Switch.

## Immediate Next Steps
1. /architecture V5.3 — Open Questions aus PRD beantworten (Branding-Storage-Tabelle, Logo-Storage, Systemvorlagen-Seed, Slice-Schnitt FEAT-532)
2. /slice-planning V5.3 — Empfehlung 5 Slices (FEAT-532 in 2 zerlegt)
3. /backend + /frontend pro Slice mit /qa nach jedem Slice (mandatory)
4. ISSUE-042 (V5.2-Pre-Pflicht, parallel laufbar): OpenAI-Key bei platform.openai.com rotieren + neuen Key in Coolify ENV OPENAI_API_KEY + lokale "open AI Business system.txt" beseitigen
5. /post-launch V5.2 — 24-48h Cron-Log-Beobachtung (morgen 04:00 UTC erste Auto-Cron-Iteration)
6. Anwaltliche Pruefung der COMPLIANCE.md + 3 Compliance-Templates (Pre-Anwalts-Pruefung kein produktiver Recording-Einsatz mit Kunden)
7. Pre-Go-Live (vor erstem externen Recording): Azure OpenAI EU Account + DPA, AZURE_OPENAI_*-ENVs in Coolify setzen, TRANSCRIPTION_PROVIDER auf azure umstellen
8. SIP-Trunk-Provider auswaehlen + DPA (vor produktivem Anruf-Volumen)
9. SMAO-DPA bei Aktivierung (SMAO_ENABLED=true)

## Active Scope
**V5.3 — E-Mail Composing Studio (Requirements done 2026-04-26):**
- FEAT-531 Branding-Settings + zentrale Mail-Layout-Engine (planned)
- FEAT-532 3-Panel-Composing-Studio `/emails/compose` (planned)
- FEAT-533 Systemvorlagen + KI-Vorlagen-Generator (planned)
- FEAT-534 Inline-Edit-Diktat ("ergaenze nach Satz X") (planned)

**V5.2 — Compliance-Sprint (released 2026-04-26 als REL-017, Internal-Test-Mode):**
- FEAT-521 Recording-Retention 7d Hardening (deployed)
- FEAT-522 Azure-Whisper-Adapter Code-Ready (deployed, openai-default aktiv)
- FEAT-523 Compliance-Templates Vertical Slice + /settings/compliance (deployed)
- FEAT-524 MeetingTimelineItem UI-Parity zu CallTimelineItem (deployed)
- FEAT-525 DSGVO-Compliance-Doku docs/COMPLIANCE.md (deployed)

**Released (deployed):**
- V2..V4.3, V5, V5.1, V5.2, V6, V6.1

**Planned (Reihenfolge):**
- V7 — Multi-User + Erweiterung

## Blockers
- aktuell keine

## Last Stable Version
- V5.2 — 2026-04-26 — released auf Hetzner als REL-017 (Compliance-Sprint, Smoke-Test PASS, Internal-Test-Mode)
- V5.1 — 2026-04-24 — released auf Hetzner als REL-016 (Asterisk + Call-Pipeline + SMAO vorbereitet, Internal-Test-Mode)
- V6.1 — 2026-04-21 — released auf Hetzner als REL-014 (Performance Premium UI)
- V6 — 2026-04-21 — released auf Hetzner als REL-013 (Performance-Tracking)
- V5 — 2026-04-22 — released auf Hetzner als REL-015 (Automatisierung + Vertriebsintelligenz)

## Notes
17 Releases deployed (REL-001..REL-017). Technologie-Stack: Next.js + Supabase (self-hosted) + Bedrock Claude Sonnet (Frankfurt) + Jitsi/Jibri (shared Infra) + pgvector RAG + Asterisk PBX + Whisper-Adapter (openai-Default, Azure-EU Code-Ready ab V5.2). Hosting: Hetzner CPX32 via Coolify. V5.2 (Compliance-Sprint, REL-017) bringt Recording-Retention 7d, Azure-Whisper-Code-Ready, /settings/compliance mit 3 editierbaren DSGVO-Templates, MeetingTimelineItem UI-Parity zu Calls und docs/COMPLIANCE.md. Internal-Test-Mode bleibt aktiv bis Anwalts-Pruefung + Switch auf Azure-EU-Whisper. ISSUE-042 (OpenAI-Key in untrackter Datei, NIE committed) ist Pre-Pflicht vor erstem produktivem Whisper-Call.
