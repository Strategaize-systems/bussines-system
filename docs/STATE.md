# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: implementing
- Current Focus: V5.3 SLC-534 **/frontend done** 2026-04-27 — 8 MTs implementiert (Variablen-Resolver `resolveVarsFromDeal` mit Vitest 3/3, Live-Preview-Komponente mit Debounce 250ms via `useDebouncedValue` Hook + iframe-Render via `renderBrandedHtml`, Server-Action `sendComposedEmail` mit Branding+Vars-Loader + sendEmailWithTracking, Senden-Button im Compose-Form, Einstiegspunkte umgestellt: Deal-Workspace + Mein Tag (mein-tag-client + ki-workspace) + Focus → `/emails/compose?dealId=...&contactId=...`). tsc 0 Fehler, Vitest 35/35, Next-Build 60/60 Routes gruen. **Naechster Schritt: `/qa SLC-534`** (12 ACs verifizieren — Live-Preview-Render, Debounce, Bit-Identitaet, Send-Pfad, Tracking-Pixel-Regression, Einstiegspunkt-Smoke, Mobile-Tab "Vorschau").
- Current Phase: V5.3 Implementation — Slice 3/5 done (SLC-531 done, SLC-532 done, SLC-533 done; SLC-534 frontend done / qa pending; SLC-535 planned). V5.2 Post-Launch confirmed stable (RPT-219). Internal-Test-Mode bleibt aktiv bis Anwalts-Pruefung + Azure-EU-Switch.

## Immediate Next Steps
1. /qa SLC-534 — 12 ACs verifizieren (Live-Preview-Render, Debounce, Bit-Identitaet zur Final-Mail, Send-Pfad inkl. DB-Row-Check, Tracking-Pixel + Link-Wrapping in versendeter Mail, Einstiegspunkt-Smoke aus Deal-Workspace + Mein Tag + Focus, Mobile-Tab "Vorschau", Cadence/IMAP-Regression-Check)
2. SLC-531 Outlook-Smoke (offen, nicht Blocker): Test-Mail an Outlook-Postfach senden + Logo/Farbe/Schrift visuell pruefen. Wenn Drift gegen Gmail: Folge-Polish
3. BL-403 Composing-Studio Style-Guide-V2-Restyling (UX-Polish, nach SLC-535 oder als V5.3-Polish-Slice)
4. /frontend SLC-535 (Inline-Edit-Diktat) — Voice + Diff-Modal (6 MTs, ~1 Tag)
6. /qa SLC-535
7. Gesamt-/qa V5.3 nach SLC-535 + /final-check V5.3 + /go-live V5.3 + /deploy V5.3 + /post-launch V5.3
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
- FEAT-532 3-Panel-Composing-Studio `/emails/compose` (in_progress — SLC-533 Layout + KI-Vorausfuellung released, SLC-534 Live-Preview + Send + Einstiegspunkte frontend done / qa pending)
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
