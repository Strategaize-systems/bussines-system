# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: implementing
- Current Focus: V5.3 SLC-531 Branding Foundation — Backend done 2026-04-27. MIG-023 Teil 1 auf Hetzner applied (branding_settings + Storage Bucket "branding" Public-Read mit 2MB Limit + Empty-Row). Pure Function renderBrandedHtml mit Fallback auf textToHtml in cockpit/src/lib/email/render.ts. 8 Vitest-Snapshot-Tests gruen (3 Renderer-Snapshots + Bit-fuer-Bit-Identitaets-Test fuer leeres Branding + HTML-Escaping-Tests). Server Actions getBranding/updateBranding/uploadLogo + getBrandingForSend Helper fuer send.ts. Settings-Page /settings/branding mit Logo-Upload, Color-Picker, Schrift-Dropdown, Kontakt-Block, Footer-Markdown. send.ts Renderer-Hook eingebaut (DEC-095 Single-Source-of-Truth). Build gruen. /qa SLC-531 ist mandatory naechster Schritt (Snapshot-Tests, Browser-Test /settings/branding, Smoke-Test echte Mail an Gmail+Outlook). 4 Slices nach SLC-531 stehen aus (SLC-532..535).
- Current Phase: V5.3 Implementation — SLC-531 Backend complete, Slice 1/5 (4 weitere stehen aus). V5.2 Post-Launch confirmed stable (RPT-219). Internal-Test-Mode bleibt aktiv bis Anwalts-Pruefung + Azure-EU-Switch.

## Immediate Next Steps
1. /qa SLC-531 (Snapshot-Tests confirmed gruen + Browser-Test /settings/branding + Smoke-Test echte Mail an Gmail+Outlook) — MANDATORY naechster Schritt
2. /backend SLC-532 (Email-Templates Schema + Systemvorlagen + KI-Generator) — MIG-023 Teil 2 + email-template-generate.ts (7 MTs, ~1 Tag)
3. /qa SLC-532
4. /frontend SLC-533 (Composing-Studio Layout + KI-Vorausfuellung) — FEAT-532 Teil 1, 3-Panel + Mobile-Tabs (7 MTs, ~1.5 Tage)
5. /qa SLC-533
6. /frontend SLC-534 (Live-Preview + Send-Integration + Einstiegspunkte) — FEAT-532 Teil 2 (8 MTs, ~1.5 Tage)
7. /qa SLC-534
8. /frontend SLC-535 (Inline-Edit-Diktat) — Voice + Diff-Modal (6 MTs, ~1 Tag)
9. /qa SLC-535
10. Gesamt-/qa V5.3 nach SLC-535 + /final-check V5.3 + /go-live V5.3 + /deploy V5.3 + /post-launch V5.3
11. ISSUE-042 (V5.2-Pre-Pflicht, parallel laufbar): OpenAI-Key bei platform.openai.com rotieren + neuen Key in Coolify ENV OPENAI_API_KEY + lokale "open AI Business system.txt" beseitigen
12. /post-launch V5.2 — 24-48h Cron-Log-Beobachtung (morgen 04:00 UTC erste Auto-Cron-Iteration)
13. Anwaltliche Pruefung der COMPLIANCE.md + 3 Compliance-Templates (Pre-Anwalts-Pruefung kein produktiver Recording-Einsatz mit Kunden)
14. Pre-Go-Live (vor erstem externen Recording): Azure OpenAI EU Account + DPA, AZURE_OPENAI_*-ENVs in Coolify setzen, TRANSCRIPTION_PROVIDER auf azure umstellen
15. SIP-Trunk-Provider auswaehlen + DPA (vor produktivem Anruf-Volumen)
16. SMAO-DPA bei Aktivierung (SMAO_ENABLED=true)

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
