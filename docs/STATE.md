# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: implementing
- Current Focus: V5.3 **5/5 Slices done** 2026-04-28 — SLC-535 Live-Smoke auf Hetzner PASS (UI-States ✅, Smoke 1 klare Anweisung ✅, Smoke 2 mehrdeutige Anweisung ✅, Smoke 3 problematische Anweisung ✅ KI blieb generisch + verwarf nichts erfunden, Verwerfen-Pfad ✅). FEAT-534 + BL-402 done. V5.3 ist damit Code+QA-komplett (SLC-531+532+533+534+535 alle done). **Naechster Schritt:** Gesamt-/qa V5.3 (Cross-Slice-Verify aller 5 Slices) → /final-check V5.3 → /go-live V5.3 → /deploy V5.3 → /post-launch V5.3.
- Current Phase: V5.3 Implementation komplett — alle 5 Slices done, ready fuer Gesamt-QA + Release-Sequenz. V5.2 Post-Launch confirmed stable. Internal-Test-Mode bleibt aktiv bis Anwalts-Pruefung + Azure-EU-Switch.

## Immediate Next Steps
1. **Gesamt-/qa V5.3** — Cross-Slice-Verify aller 5 Slices (SLC-531..535) im Zusammenhang: Branding → Templates+KI-Generator → Composing-Studio Layout → Live-Preview+Send → Inline-Edit-Diktat. Pflicht-Pruefung: End-to-End-Workflow vom Erstellen einer Vorlage bis zum Senden einer Mail mit Inline-Edit.
2. /final-check V5.3 (Hygiene, Dependencies, Security)
3. /go-live V5.3 + User-Coolify-Manual-Deploy + /post-launch V5.3 (24-48h)
4. Branding-Daten-Korrektur "Strategaize **Tnasition** GmbH" → "Transition" in `/settings/branding` Footer (User-Aktion, kein Code)
3. SLC-531 Outlook-Smoke (offen, nicht Blocker): Test-Mail an Outlook-Postfach + Logo/Farbe/Schrift visuell pruefen
4. Senden-Flow Real-Mail-Smoke (organisch beim naechsten echten Outbound-Mail-Versand)
5. Gesamt-/qa V5.3 nach SLC-535 + /final-check V5.3 + /go-live V5.3 + /deploy V5.3 + /post-launch V5.3
8. ISSUE-043 Color-Picker AC9-Drift in V5.3-Polish: Color-Input durch Hex-Text-Input mit null-Semantik oder "Branding zuruecksetzen"-Button
9. ISSUE-042 (V5.2-Pre-Pflicht, parallel laufbar): OpenAI-Key bei platform.openai.com rotieren + neuen Key in Coolify ENV OPENAI_API_KEY + lokale "open AI Business system.txt" beseitigen
10. /post-launch V5.2 — 24-48h Cron-Log-Beobachtung (morgen 04:00 UTC erste Auto-Cron-Iteration)
11. Anwaltliche Pruefung der COMPLIANCE.md + 3 Compliance-Templates (Pre-Anwalts-Pruefung kein produktiver Recording-Einsatz mit Kunden)
12. Pre-Go-Live (vor erstem externen Recording): Azure OpenAI EU Account + DPA, AZURE_OPENAI_*-ENVs in Coolify setzen, TRANSCRIPTION_PROVIDER auf azure umstellen
13. SIP-Trunk-Provider auswaehlen + DPA (vor produktivem Anruf-Volumen)
14. SMAO-DPA bei Aktivierung (SMAO_ENABLED=true)

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
