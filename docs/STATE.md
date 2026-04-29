# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: requirements
- Current Focus: **V5.5 REQUIREMENTS DONE 2026-04-29** — Angebot-Erstellung-Feature (BL-405) als V5.5 aufgesetzt. PRD V5.5-Section in `docs/PRD.md` ergaenzt (Problem, Goal, Users, 6 Architekturleitplanken, 5 Features, Scope/OoS, Constraints, Risks, 10 Success Criteria, 10 Open Questions). 5 Features angelegt (FEAT-551 Schema/MIG-026, FEAT-552 Workspace UI, FEAT-553 PDF-Renderer, FEAT-554 Status/Versionierung, FEAT-555 Composing-Studio-Hookup = BL-404 Teil 2). Roadmap V5.5 status=active angelegt. Backlog: BL-405 + BL-404 auf in_progress, version=V5.5. Naechster Schritt: /architecture V5.5 (10 Open Questions sind dort zu finalisieren). V5.4 (REL-019) Post-Launch passiv parallel.
- Current Phase: V5.5 Requirements done. Naechster Schritt /architecture V5.5.

## Immediate Next Steps
1. **/architecture V5.5** — 10 Open Questions aus PRD finalisieren (PDF-Library-Wahl, Live-Preview-Strategie, Snapshot-Tiefe, Status-Sent-Trigger, Versionierung-Lifecycle, Expire-Cron-Zeit, Storage-Pfad-Schema, Anhang-Picker-Filter, Watermark-Format, Slicing-Schnitt). Schema MIG-026 ausplanen.
2. **/slice-planning V5.5** — Empfehlung 5 Slices SLC-551..555 (1:1 zu Features), finale Schnittspezifikation.
3. **/backend SLC-551** — Schema-Migration MIG-026, Storage-Bucket `proposal-pdfs`, RLS.
4. **V5.4 Post-Launch (passiv)** — Stable-Window 24-48h, /post-launch V5.4 nach. /post-launch V5.3 ueberfaellig (passiv).
5. **V5.4.x Patch-Carryover (optional, nicht release-blockierend):**
   - SLC-541 M1: ConditionalColorPicker Refactor zu derived-state
   - SLC-542 M1/ISSUE-045: Server-side Total-Size Limit
   - SLC-542 L1: Filename-Kollision-Suffix-Pattern bei upsert
6. **Carryover (nicht V5.5-Scope):** ISSUE-042 OpenAI-Key Pre-Pflicht, Anwalts-Pruefung COMPLIANCE.md, Azure OpenAI EU + DPA + Switch (Pre-Production-Gate nach V5.5), BL-397 GitHub-App Org-Anbindung, A5 SLC-531 Outlook-Smoke.

## Active Scope
**V5.5 — Angebot-Erstellung (REQUIREMENTS DONE 2026-04-29):**
- FEAT-551 Angebot-Schema-Erweiterung + Position-Items (planned, MIG-026)
- FEAT-552 Angebot-Workspace UI 3-Panel (planned, /proposals/[id]/edit)
- FEAT-553 PDF-Renderer + Branding (planned, Library-Wahl in /architecture)
- FEAT-554 Status-Lifecycle + Versionierung (planned, draft/sent/accepted/rejected/expired + parent_proposal_id)
- FEAT-555 Angebot-Anhang im Composing-Studio (planned, BL-404 Teil 2 Hookup)

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
