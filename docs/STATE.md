# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: architecture
- Current Focus: V5.3 E-Mail Composing Studio Architecture abgeschlossen 2026-04-26. Alle 8 Open Questions aus PRD geklaert via DEC-088..DEC-095. MIG-023 fuer 1 neue Tabelle `branding_settings` + 4 nullable Spalten auf `email_templates` + Storage Bucket `branding` + Seed-INSERT fuer 6+ Systemvorlagen geplant. Renderer `renderBrandedHtml` als Single-Source-of-Truth fuer HTML-Output (DEC-095). Empfaenger-KI-Vorschlag deterministisch (DEC-092, kein LLM-Call). Mobile via Tabs in derselben Route (DEC-093). Slice-Empfehlung: 5 Slices SLC-531..SLC-535 mit FEAT-532 in 2 Slices zerlegt. V5.2 bleibt Post-Launch stable. Pre-Pflichten zur V5.2 (ISSUE-042 OpenAI-Key-Rotation, Anwalts-Pruefung COMPLIANCE.md, Azure-EU-Whisper-Switch) bleiben offen — unabhaengig von V5.3-Arbeit. Naechster Schritt: /slice-planning V5.3.
- Current Phase: V5.3 Architecture done — bereit fuer /slice-planning. V5.2 Post-Launch confirmed stable (RPT-219, 4h Live-Beobachtung 2026-04-26). Internal-Test-Mode bleibt aktiv bis Anwalts-Pruefung + Azure-EU-Switch.

## Immediate Next Steps
1. /slice-planning V5.3 — 5 Slices SLC-531..SLC-535 strukturiert ausdefinieren mit Acceptance Criteria, Micro-Tasks, QA-Fokus
2. /backend SLC-531 (Branding Foundation) — MIG-023 + Renderer + /settings/branding
3. /backend SLC-532 (Email-Templates Schema + Systemvorlagen + KI-Generator)
4. /frontend SLC-533 (Composing-Studio Layout + KI-Vorausfuellung) — FEAT-532 Teil 1
5. /frontend SLC-534 (Live-Preview + Send-Integration + Einstiegspunkte) — FEAT-532 Teil 2
6. /frontend SLC-535 (Inline-Edit-Diktat)
7. /qa nach JEDEM Slice (mandatory)
8. ISSUE-042 (V5.2-Pre-Pflicht, parallel laufbar): OpenAI-Key bei platform.openai.com rotieren + neuen Key in Coolify ENV OPENAI_API_KEY + lokale "open AI Business system.txt" beseitigen
9. /post-launch V5.2 — 24-48h Cron-Log-Beobachtung (morgen 04:00 UTC erste Auto-Cron-Iteration)
10. Anwaltliche Pruefung der COMPLIANCE.md + 3 Compliance-Templates (Pre-Anwalts-Pruefung kein produktiver Recording-Einsatz mit Kunden)
11. Pre-Go-Live (vor erstem externen Recording): Azure OpenAI EU Account + DPA, AZURE_OPENAI_*-ENVs in Coolify setzen, TRANSCRIPTION_PROVIDER auf azure umstellen
12. SIP-Trunk-Provider auswaehlen + DPA (vor produktivem Anruf-Volumen)
13. SMAO-DPA bei Aktivierung (SMAO_ENABLED=true)

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
