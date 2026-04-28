# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: post-launch
- Current Focus: V5.3 **deployed als REL-018** 2026-04-28 — User-Coolify-Manual-Deploy durch, Quick-Smoke OK gemeldet (Login + /emails/compose laedt + 3-Panel sichtbar + Inline-Diktat-Button da). Session-Handoff durchgefuehrt: 3 IMPs (IMP-183 Bedrock-maxTokens-Default, IMP-184 Records-Drift-Parent-Status, IMP-185 STATE.md-Immediate-Next-Steps-Verrottung), 2 Memory-Eintraege (project_business_system_v53_released, session_handoff_2026_04_28_v53_deployed), Records komplett synchron. **/post-launch V5.3** laeuft passiv 24-48h — formaler Abschluss in naechster oder uebernaechster Session, kein aktiver Handlungsbedarf jetzt. **Naechste Session: Backlog-Review** (User-Wunsch — gemeinsam entscheiden, was als naechstes gebaut wird).
- Current Phase: V5.3 deployed, /post-launch passiv 24-48h. V5.2 Post-Launch confirmed stable. Internal-Test-Mode bleibt aktiv bis Anwalts-Pruefung + Azure-EU-Switch.

## Immediate Next Steps
1. **Backlog-Review-Session** (naechste Session, User-Wunsch) — alle BL-Items in planning/backlog.json gemeinsam mit User durchgehen, entscheiden was als naechstes gebaut wird (V5.4-Polish vs. neue Feature-Versionen vs. Bugfixes).
2. **/post-launch V5.3 formaler Abschluss** — in naechster oder uebernaechster Session, wenn 24-48h um sind und keine 500er aufgetreten. Pruefe Bedrock-Audit-Logs, send-action-Logs, /emails/compose-Errors. Bei stable: STATE.md auf `released`, RELEASES.md REL-018 unveraendert.
3. **V5.4-Polish-Carryover** (nach Backlog-Review zu priorisieren):
   - ISSUE-043 Color-Picker AC9-Drift in Branding-Form
   - ESLint 10 Strict-Mode-Hinweise (React-19-Hook-Order in new-template-dialog + inline-edit-dialog)
   - COMPLIANCE.md V5.3-Update (Composing-Studio + Inline-Edit + Branding erwaehnen)
   - Branding-Daten-Korrektur "Strategaize **Tnasition** GmbH" → "Transition" in /settings/branding Footer (User-Aktion ohne Code)
4. **SLC-531 Outlook-Smoke** (offen, nicht Blocker): Test-Mail an Outlook-Postfach beim naechsten echten Outbound.
5. **Carryover ISSUE-042** (V4.1+V5.1-Pre-Pflicht, NICHT V5.3-blockierend): OpenAI-Key rotieren + Coolify ENV setzen vor erstem produktivem Kunden-Recording.
6. **Anwaltliche Pruefung** der COMPLIANCE.md + 3 Compliance-Templates (V5.2-Carryover, Pre-Pflicht vor produktivem Recording).
7. **Pre-Recording-Go-Live** (vor erstem externen Recording): Azure OpenAI EU Account + DPA, AZURE_OPENAI_*-ENVs in Coolify, TRANSCRIPTION_PROVIDER auf azure.
8. **SIP-Trunk-Provider** auswaehlen + DPA (vor produktivem Anruf-Volumen).
9. **SMAO-DPA** bei Aktivierung (SMAO_ENABLED=true).
10. **End-of-Build-Phase:** durchgaengiger E2E-Workflow-Sweep mit Testkunden (per feedback_e2e_smoke_at_buildup_end.md verschoben).

## Active Scope
**V5.3 — E-Mail Composing Studio (Implementation in progress 2026-04-27):**
- FEAT-531 Branding-Settings + zentrale Mail-Layout-Engine (done — SLC-531 deployed)
- FEAT-532 3-Panel-Composing-Studio `/emails/compose` (done — SLC-533 Layout + KI-Vorausfuellung + SLC-534 Live-Preview + Send + Einstiegspunkte vollstaendig User-bestaetigt; BL-403 Style-Guide-V2-Restyling als naechster UI-Polish-Schritt)
- FEAT-533 Systemvorlagen + KI-Vorlagen-Generator (done — SLC-532 Backend done + UI in SLC-533)
- FEAT-534 Inline-Edit-Diktat ("ergaenze nach Satz X") (done — SLC-535 Live-Smoke PASS 2026-04-28)

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
