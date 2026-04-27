# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: qa
- Current Focus: V5.3 SLC-531 Branding Foundation — Backend done + /qa PASS (automatisiert) am 2026-04-27. MIG-023 Teil 1 auf Hetzner applied. 23/23 Vitest-Tests gruen (3 Renderer-Snapshots + Identitaets-/Escaping-Tests), Lint sauber, tsc --noEmit sauber, DB-State verifiziert (1 Empty-Row + Bucket + RLS). 1 neue Issue ISSUE-043 (Medium): Color-Picker submitted IMMER einen Hex-Wert -> nach erstem "Save" auf /settings/branding bricht AC9 (Bit-fuer-Bit-Identitaet zum V5.2-Output) stillschweigend, weil isBrandingEmpty den primary_color als gesetzt sieht. Kein Blocker, dokumentierter SQL-Workaround, Folge-Polish in SLC-532 oder spaeter. Verbleibende Verifikation verlangt User-Aktion: AC2 Browser-Logo-Upload, AC3 Form-Roundtrip, AC8 echter Mail-Smoke an Gmail + Outlook (visuell). Nach User-OK werden SLC-531/FEAT-531/BL-398 auf done gesetzt und /backend SLC-532 ist der naechste Schritt.
- Current Phase: V5.3 Implementation — SLC-531 Backend+QA done (automatisiert), User-Smoke pending. Slice 1/5. V5.2 Post-Launch confirmed stable (RPT-219). Internal-Test-Mode bleibt aktiv bis Anwalts-Pruefung + Azure-EU-Switch.

## Immediate Next Steps
1. **User-Smoke SLC-531** — Browser-Test /settings/branding (AC2/AC3) + echte Mail an Test-Gmail + Test-Outlook (AC8). RPT-224 listet die Schritte.
2. Nach User-OK: SLC-531/FEAT-531/BL-398 auf done setzen
3. /backend SLC-532 (Email-Templates Schema + Systemvorlagen + KI-Generator) — MIG-023 Teil 2 + email-template-generate.ts (7 MTs, ~1 Tag)
4. /qa SLC-532
5. /frontend SLC-533 (Composing-Studio Layout + KI-Vorausfuellung) — FEAT-532 Teil 1, 3-Panel + Mobile-Tabs (7 MTs, ~1.5 Tage)
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
- FEAT-531 Branding-Settings + zentrale Mail-Layout-Engine (in_progress — SLC-531 Backend done, /qa pending)
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
