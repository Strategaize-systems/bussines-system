# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: final-check
- Current Focus: **V5.5 /final-check PASS — CONDITIONALLY READY 2026-05-01 (RPT-265).** Alle 7 Audit-Dimensionen durch: Code-Quality, Security/Privacy, Compliance (V5.5-Section in COMPLIANCE.md ergaenzt), Testing-depth (proportional fuer Internal-Tool), CI/CD (Container-Health + Cron-Auth verifiziert), Observability (60 V5.5 Audit-Eintraege + structured logging), Post-go-live (REL-020-Notes komplett, Rollback-Pfad rein additiv). Pre-Release-Luecke (COMPLIANCE.md V5.5-Section fehlte) im Final-Check selbst gefixt. Bedingungen fuer Go-Live: Internal-Test-Mode bleibt aktiv (Pre-Production-Compliance-Gate vor V5.6), ISSUE-047 F1 Hydration #418 als nicht-blockierender Carryover, DB-Test-Artefakte aus QA bleiben oder optionales Cleanup vor Deploy.
- Current Phase: V5.5 /final-check **PASS (CONDITIONALLY READY)**. Naechste: /go-live V5.5 → /deploy als REL-020 Final-Release.

## Immediate Next Steps
1. **/go-live V5.5** — Release-Risk explizit machen + Go/No-Go-Decision dokumentieren.
2. **/deploy V5.5 als REL-020 Final-Release** — REL-020-Notes finalisieren mit echtem Datum.
3. **(optional)** F1 Hydration #418 Investigation (ISSUE-047) als V5.5.x-Patch — User-Entscheid pre/post-Deploy.
4. **(optional)** DB-Cleanup der QA-Smoke-Artefakte — kosmetisch.
5. **Roadmap-Update** nach Deploy: V5.5 → `released`, alle FEAT-551..555 → `deployed`.
4. **F1 Hydration-Investigation** auf `/proposals` — als V5.5.x-Patch ODER vor V5.5 Final-Release. Wahrscheinlich Datums-Format-Drift im Listing-Card-Layout.
5. **Coolify-Cron Erstlauf 02:00 Berlin (User-Verifikation am Folgetag)** — Audit-SQL laut REL-020-Notes.
5. **/qa SLC-555** — 3 Smoke-Faelle (Proposal/PC-Upload/Mix) + V5.4-Cadence-Regression + Status-Auto-Sent + Idempotenz.
6. **/qa V5.5 Gesamt + /final-check + /go-live + /deploy** — REL-020 als Final-Release nach SLC-555.
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
- FEAT-553 PDF-Renderer + Branding (done 2026-04-30, **pdfmake** als Library DEC-105, Adapter-Pattern, /qa PASS via RPT-258, Mixed-Content-Hotfix Commit `91020b2` Server-Proxy /api/proposals/[id]/pdf live)
- FEAT-554 Status-Lifecycle + Versionierung (done 2026-04-30, /backend + /qa PASS RPT-260: Whitelist transitions.ts + 21 Vitest-Tests, transitionProposalStatus mit Idempotenz DEC-108, createProposalVersion mit V1-unangetastet DEC-109 Live-verifiziert, Auto-Expire-Cron-Endpoint /api/cron/expire-proposals DEC-110 Live + DB-Audit-Smoke PASS + Idempotenz-Check, Workspace Status-Buttons + Confirm-Dialog Live, Read-only-Mode mit Server-Side-Guard `assertProposalEditable` in 5 Mutate-Actions, /proposals-Listing Status-Badge + Anzeigen-Button mit ?readonly=1, REL-020-Notes Coolify-Cron-Anleitung, Coolify-Cron `expire-proposals` aktiv)
- FEAT-555 Angebot-Anhang im Composing-Studio (done 2026-05-01, /qa Live-Smoke PASS RPT-263: 4 Live-Mail-Sends, CHECK-Constraint Tests, 6 Browser-Smokes, Idempotenz live bewiesen in 2 Edge-Cases. ProposalAttachmentPicker + attachProposalToCompose + send.ts Bucket-Diskriminator + Junction `source_type`/`proposal_id` + idempotenter transitionProposalStatus post-send.)

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
