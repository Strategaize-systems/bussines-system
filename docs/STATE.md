# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: implementing
- Current Focus: **V5.5 SLC-552 + /qa done 2026-04-30** — RPT-255 (Frontend-Completion) + RPT-256 (QA-Review) zeigen: 14/14 Code-ACs erfuellt, AC15 Browser-Smoke pending nach Coolify-Deploy. QA-Lauf hat latenten Schema-Bug `notes`-Feld in proposalEditSchema gefixt (DB hat keine notes-Spalte, nur scope_notes — Deviation-Rule 1 angewendet). Wiring-Chain Component → Server-Action → DB komplett verifiziert. Stub-Scan: clean. Tests 67/67, Build gruen, TypeScript clean. Bereit fuer Coolify-Deploy + Browser-Smoke.
- Current Phase: V5.5 Implementation. SLC-551 + SLC-552 (incl. /qa) done. Naechster Schritt: User-Coolify-Deploy + Browser-Smoke, dann /backend SLC-553.

## Immediate Next Steps
1. **User-Coolify-Deploy + Browser-Smoke (AC15 SLC-552)** — Drei-Einstiegspunkt-Test, Cent-genaue Berechnung, Drag-Reorder, Auto-Save-Smoke, Mobile-Tabs am Live-Server.
2. **/backend SLC-553** — pdfmake-Adapter + DocDefinition + Image-Helper + Filename-Helper + generateProposalPdf-Action + PreviewPanel-Hookup + Watermark + Multi-Client-Smokes (~5-7h, 8 MTs).
3. **/qa SLC-553** — UI-vs-PDF-Cent-Genauigkeit, 4 Mailclient-Smokes (Adobe/Chrome/Outlook/Gmail), Watermark-Toggle, Edge-Cases.
4. **/backend SLC-554** — Whitelist-Transition + Versionierung + Auto-Expire-Cron + Status-Buttons + StatusBadge + VersionsList + Read-only-Mode + REL-020-Cron-Notes (~4-6h, 9 MTs).
5. **/qa SLC-554** — Status-Whitelist + Idempotenz + Versionierung + Cron-Smoke + UI-Smokes.
6. **/backend + /frontend SLC-555** — ProposalAttachmentPicker + AttachmentsSection-Erweiterung + send.ts source_type-Diskriminator + sendComposedEmail-Update + Cross-Cut-Smokes (~3-4h, 10 MTs).
7. **/qa SLC-555** — 3 Smoke-Faelle (Proposal/PC-Upload/Mix) + V5.4-Cadence-Regression + Status-Auto-Sent + Idempotenz.
8. **/qa V5.5 Gesamt + /final-check + /go-live + /deploy** — REL-020 als Final-Release nach SLC-555.
9. **V5.4 Post-Launch (passiv)** — Stable-Window 24-48h, /post-launch V5.4 nach. /post-launch V5.3 ueberfaellig (passiv).
10. **V5.4.x Patch-Carryover (optional, nicht release-blockierend):**
    - SLC-541 M1: ConditionalColorPicker Refactor zu derived-state
    - SLC-542 M1/ISSUE-045: Server-side Total-Size Limit
    - SLC-542 L1: Filename-Kollision-Suffix-Pattern bei upsert
11. **Carryover (nicht V5.5-Scope):** ISSUE-042 OpenAI-Key Pre-Pflicht, Anwalts-Pruefung COMPLIANCE.md, Azure OpenAI EU + DPA + Switch (Pre-Production-Gate nach V5.5), BL-397 GitHub-App Org-Anbindung, A5 SLC-531 Outlook-Smoke.

## Active Scope
**V5.5 — Angebot-Erstellung (IMPLEMENTING — SLC-551 done 2026-04-29):**
- FEAT-551 Angebot-Schema-Erweiterung + Position-Items (in_progress, MIG-026 applied auf Hetzner, Server Actions + Pfad-Helper live)
- FEAT-552 Angebot-Workspace UI 3-Panel (done 2026-04-30, /proposals/[id]/edit live, native React-State + Custom-Debounce statt RHF/lodash, @dnd-kit/sortable)
- FEAT-553 PDF-Renderer + Branding (planned, **pdfmake** als Library DEC-105, Adapter-Pattern)
- FEAT-554 Status-Lifecycle + Versionierung (planned, V1-Status bleibt unangetastet DEC-109, Auto-Expire-Cron 02:00 Berlin DEC-110)
- FEAT-555 Angebot-Anhang im Composing-Studio (planned, source_type-Diskriminator in email_attachments DEC-108)

**Architektur-Entscheidungen V5.5:** DEC-105 pdfmake, DEC-106 HTML-Live-Preview, DEC-107 Snapshot inkl. price_at_creation, DEC-108 Status-Sent automatisch+manuell, DEC-109 V1-Status unangetastet, DEC-110 Cron 02:00 Berlin, DEC-111 Pfad-Schema, DEC-112 alle Status zeigen+Warning, DEC-113 Footer+Suffix-Watermark, DEC-114 5 Slices 1:1 zu Features.

**Released (deployed):**
- V2..V4.3, V5, V5.1, V5.2, V5.3, V5.4, V6, V6.1

**Planned (Reihenfolge):**
- V5.5 — Angebot-Erstellung (active, Requirements done)
- Pre-Production-Compliance-Gate (zwischen V5.5 und V7) — Anwalts-Pruefung + Azure-OpenAI-EU-Switch + ISSUE-042
- V7 — Multi-User + Erweiterung

## Blockers
- aktuell keine

## Last Stable Version
- V5.4 — 2026-04-29 — released auf Hetzner als REL-019 (Composing-Studio Polish + E-Mail-Anhaenge-Upload PC-Direkt, Internal-Test-Mode, Live-Smoke PASS Multipart-Mail PDF+PNG+ZIP an Gmail + Tracking-Pixel-Open + Junction-Insert verifiziert)
- V5.3 — 2026-04-28 — released auf Hetzner als REL-018 (E-Mail Composing Studio, Internal-Test-Mode, Quick-Smoke OK)
- V5.2 — 2026-04-26 — released auf Hetzner als REL-017 (Compliance-Sprint, Smoke-Test PASS, Internal-Test-Mode)
- V5.1 — 2026-04-24 — released auf Hetzner als REL-016 (Asterisk + Call-Pipeline + SMAO vorbereitet, Internal-Test-Mode)
- V6.1 — 2026-04-21 — released auf Hetzner als REL-014 (Performance Premium UI)
- V6 — 2026-04-21 — released auf Hetzner als REL-013 (Performance-Tracking)

## Notes
18 Releases deployed (REL-001..REL-018). Technologie-Stack: Next.js + Supabase (self-hosted) + Bedrock Claude Sonnet (Frankfurt) + Jitsi/Jibri (shared Infra) + pgvector RAG + Asterisk PBX + Whisper-Adapter (openai-Default, Azure-EU Code-Ready ab V5.2) + E-Mail Composing Studio (V5.3). Hosting: Hetzner CPX32 via Coolify. V5.3 (E-Mail Composing Studio, REL-018) bringt Branding-Settings + 3-Panel-Compose + Systemvorlagen + KI-Generator + Inline-Edit-Diktat. V5.4 (in Planung) erweitert Composing-Studio um E-Mail-Anhaenge-Upload und schliesst V5.3-Hygiene-Themen (Color-Picker Toggle, ESLint, COMPLIANCE.md, Coolify-Crons) ab. Internal-Test-Mode bleibt aktiv bis Anwalts-Pruefung + Switch auf Azure-EU-Whisper. ISSUE-042 (OpenAI-Key in untrackter Datei, NIE committed) ist Pre-Pflicht vor erstem produktivem Whisper-Call.
