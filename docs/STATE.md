# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: implementing
- Current Focus: V5.3 SLC-532 Email-Templates Schema + Systemvorlagen + KI-Generator **DONE** 2026-04-27 (Backend). MIG-023 Teil 2 auf Hetzner applied (idempotenter Re-Run verifiziert), 8 Systemvorlagen geseedet (6 DE + 1 EN + 1 NL, 331-455 Zeichen Body), 4 neue Spalten + 3 neue Indizes auf email_templates. template-actions.ts erweitert (Filter system/own/all + duplicateSystemTemplate + delete/update-Guard fuer Systemvorlagen). KI-Prompt email-template-generate.ts + Server Action generateEmailTemplate erstellt mit Auth + Rate-Limit + Audit-Log. tsc gruen, 9/9 Vitest-Tests gruen. SLC-532/BL-399 auf done, FEAT-533 in_progress (UI-Anbindung folgt in SLC-533). **Naechster Schritt: /qa SLC-532** (Smoke-Test 3 KI-Prompts gegen Bedrock + DB-AC-Verifikation).
- Current Phase: V5.3 Implementation — Slice 2/5 done (Backend), /qa pending. V5.2 Post-Launch confirmed stable (RPT-219). Internal-Test-Mode bleibt aktiv bis Anwalts-Pruefung + Azure-EU-Switch.

## Immediate Next Steps
1. /qa SLC-532 — 3 Test-Prompts gegen `generateEmailTemplate` (Multiplikator-Erstansprache, Follow-up Angebot kalt, Danke nach Termin) + DB-AC-Verifikation + duplicateSystemTemplate-Smoke
2. SLC-531 Outlook-Smoke (offen, nicht Blocker): Test-Mail an Outlook-Postfach senden + Logo/Farbe/Schrift visuell pruefen. Wenn Drift gegen Gmail: Folge-Polish
3. /frontend SLC-533 (Composing-Studio Layout + KI-Vorausfuellung) — FEAT-532 Teil 1, 3-Panel + Mobile-Tabs (7 MTs, ~1.5 Tage)
6. /qa SLC-533
7. /frontend SLC-534 (Live-Preview + Send-Integration + Einstiegspunkte) — FEAT-532 Teil 2 (8 MTs, ~1.5 Tage)
8. /qa SLC-534
9. /frontend SLC-535 (Inline-Edit-Diktat) — Voice + Diff-Modal (6 MTs, ~1 Tag)
10. /qa SLC-535
11. Gesamt-/qa V5.3 nach SLC-535 + /final-check V5.3 + /go-live V5.3 + /deploy V5.3 + /post-launch V5.3
12. ISSUE-043 Color-Picker AC9-Drift in V5.3-Polish (SLC-532 oder spaeter): Color-Input durch Hex-Text-Input mit null-Semantik oder "Branding zuruecksetzen"-Button
13. ISSUE-042 (V5.2-Pre-Pflicht, parallel laufbar): OpenAI-Key bei platform.openai.com rotieren + neuen Key in Coolify ENV OPENAI_API_KEY + lokale "open AI Business system.txt" beseitigen
14. /post-launch V5.2 — 24-48h Cron-Log-Beobachtung (morgen 04:00 UTC erste Auto-Cron-Iteration)
15. Anwaltliche Pruefung der COMPLIANCE.md + 3 Compliance-Templates (Pre-Anwalts-Pruefung kein produktiver Recording-Einsatz mit Kunden)
16. Pre-Go-Live (vor erstem externen Recording): Azure OpenAI EU Account + DPA, AZURE_OPENAI_*-ENVs in Coolify setzen, TRANSCRIPTION_PROVIDER auf azure umstellen
17. SIP-Trunk-Provider auswaehlen + DPA (vor produktivem Anruf-Volumen)
18. SMAO-DPA bei Aktivierung (SMAO_ENABLED=true)

## Active Scope
**V5.3 — E-Mail Composing Studio (Implementation in progress 2026-04-27):**
- FEAT-531 Branding-Settings + zentrale Mail-Layout-Engine (done — SLC-531 deployed)
- FEAT-532 3-Panel-Composing-Studio `/emails/compose` (planned)
- FEAT-533 Systemvorlagen + KI-Vorlagen-Generator (in_progress — SLC-532 Backend done; UI in SLC-533)
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
