# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: stable
- Current Focus: V5.2 Compliance-Sprint released am 2026-04-26 als REL-017. Smoke-Test in Production PASS (Settings-Compliance + MeetingTimelineItem + V5.1-Regression + Recording-Retention-Cron retention_days=7 verifiziert). ENV-Befund waehrend Smoke-Test: RECORDING_RETENTION_DAYS war in Coolify auf 30 gesetzt — User hat auf 7 korrigiert. Pre-Pflicht offen: ISSUE-042 (OpenAI-API-Key in untrackter Datei, NIE committed) — Key rotieren + neuen Key in Coolify ENV OPENAI_API_KEY + lokale Datei beseitigen, vor erstem produktivem Whisper-Call mit Kundendaten. Naechster Schritt: /post-launch V5.2 (24-48h Cron-Log-Beobachtung).
- Current Phase: Post-Launch confirmed stable nach V5.2-Release (RPT-219, 4h Live-Beobachtung am 2026-04-26). App-Container healthy, 0 Errors, Recording-Retention-Cron retention_days=7 manuell verifiziert + Coolify-Auto-Cron-Schedule 0 4 * * * UTC bestaetigt. Internal-Test-Mode bleibt aktiv bis Anwalts-Pruefung der COMPLIANCE.md + Switch auf Azure-EU-Whisper.

## Immediate Next Steps
1. /post-launch V5.2 — 24-48h Cron-Log-Beobachtung (morgen 04:00 UTC erste Auto-Cron-Iteration)
2. ISSUE-042: OpenAI-Key bei platform.openai.com rotieren + neuen Key in Coolify ENV OPENAI_API_KEY + lokale "open AI Business system.txt" beseitigen
3. Anwaltliche Pruefung der COMPLIANCE.md + 3 Compliance-Templates (Pre-Anwalts-Pruefung kein produktiver Recording-Einsatz mit Kunden)
4. Pre-Go-Live (vor erstem externen Recording): Azure OpenAI EU Account + DPA, AZURE_OPENAI_*-ENVs in Coolify setzen, TRANSCRIPTION_PROVIDER auf azure umstellen
5. SIP-Trunk-Provider auswaehlen + DPA (vor produktivem Anruf-Volumen)
6. SMAO-DPA bei Aktivierung (SMAO_ENABLED=true)
7. Naechste Version: V5.3 E-Mail Composing Studio (BL-386, war urspruenglich V5.2, durch Compliance-Sprint nachgelagert)

## Active Scope
**V5.2 — Compliance-Sprint (released 2026-04-26 als REL-017, Internal-Test-Mode):**
- FEAT-521 Recording-Retention 7d Hardening (deployed)
- FEAT-522 Azure-Whisper-Adapter Code-Ready (deployed, openai-default aktiv)
- FEAT-523 Compliance-Templates Vertical Slice + /settings/compliance (deployed)
- FEAT-524 MeetingTimelineItem UI-Parity zu CallTimelineItem (deployed)
- FEAT-525 DSGVO-Compliance-Doku docs/COMPLIANCE.md (deployed)

**Released (deployed):**
- V2..V4.3, V5, V5.1, V5.2, V6, V6.1

**Planned (Reihenfolge):**
- V5.3 — E-Mail Composing Studio (BL-386, urspruenglich V5.2, durch Compliance-Sprint nachgelagert)
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
