# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: final-check
- Current Focus: V5.4 Final-Check READY 2026-04-29 (RPT-246) — 0 Blocker, 0 High, 0 Medium in V5.4-Scope, 1 Low (ISSUE-045 akzeptiert). Live-Smoke gegen Hetzner erfolgreich: Multipart-Mail PDF+PNG+ZIP an Gmail empfangen, 3 Junction-Rows in `email_attachments`, Tracking-Pixel-`open`-Event 38s nach Send. COMPLIANCE.md V5.4-Section heute ergaenzt (E-Mail-Anhaenge-Pipeline beschrieben). 2 Live-Smoke-Hotfixes 2026-04-29: bodySizeLimit (12mb→4mb nach Refactor) + Refactor Anhang-Upload von Server-Action auf API-Route mit ASCII-strict Filename-Sanitization (Pattern aus Onboarding-Plattform). tsc 0, ESLint clean, Vitest 35/35, Next-Build gruen, App-Container healthy. /post-launch V5.3 ist faellig (Stable-Window seit 2026-04-28 abgelaufen).
- Current Phase: V5.4 Final-Check done. Naechster Schritt /go-live.

## Immediate Next Steps
1. **/go-live V5.4** — formale GO-Decision-Bewertung mit explizitem Release-Statement.
2. **/deploy V5.4** (manuell durch User in Coolify) — Redeploy auf Commit-HEAD nach Final-Check-Commit + REL-019-Notes finalisieren (Date, Summary, Risks).
3. **/post-launch V5.3 formaler Abschluss** — Stable-Window seit 2026-04-28 abgelaufen, parallel zur V5.4-Release-Sequenz machbar.
4. **V5.4.x Patch-Carryover (optional, nicht release-blockierend):**
   - SLC-541 M1: ConditionalColorPicker Refactor zu derived-state (entfernt internes useState+useEffect, Verhalten identisch)
   - SLC-542 M1/ISSUE-045: Server-side Total-Size Limit (Client-Convenience → echtes Server-Enforcement, V5.5+ Operations-Topic)
   - SLC-542 L1: Filename-Kollision-Suffix-Pattern bei upsert
5. **Carryover (nicht V5.4-Scope):** ISSUE-042 OpenAI-Key Pre-Pflicht, Anwalts-Pruefung COMPLIANCE.md, Azure OpenAI EU + DPA + Switch, BL-397 GitHub-App Org-Anbindung, A5 SLC-531 Outlook-Smoke (User testet sobald Outlook-Postfach verfuegbar), BL-405 Angebot-Erstellung-Feature (V5.5+).

## Active Scope
**V5.4 — Composing-Studio Polish + E-Mail-Anhaenge (Final-Check READY 2026-04-29, Live-Smoke verifiziert):**
- FEAT-541 V5.4-Polish (done — Color-Picker AC9-Drift Fix per ConditionalColorPicker DEC-102 + ESLint Hook-Order Cleanup + COMPLIANCE.md V5.3-Section + REL-019 mit Coolify-Cron-Cleanup-Anleitung)
- FEAT-542 E-Mail-Anhaenge-Upload PC-Direkt (done — MIG-025 live, Drag&Drop + File-Picker, Storage-Bucket `email-attachments` privat, Junction-Table `email_attachments`, 3-fach validateAttachment, Multipart-SMTP via Nodemailer, Live-Preview-Indikator)

**Released (deployed):**
- V2..V4.3, V5, V5.1, V5.2, V5.3, V6, V6.1

**Planned (Reihenfolge):**
- V5.5+ — BL-405 Angebot-Erstellung-Feature + BL-404 Teil 2 (Angebot-Anhang an E-Mail), eigene Requirements-Sequenz
- V7 — Multi-User + Erweiterung

## Blockers
- aktuell keine

## Last Stable Version
- V5.3 — 2026-04-28 — released auf Hetzner als REL-018 (E-Mail Composing Studio, Internal-Test-Mode, Quick-Smoke OK)
- V5.2 — 2026-04-26 — released auf Hetzner als REL-017 (Compliance-Sprint, Smoke-Test PASS, Internal-Test-Mode)
- V5.1 — 2026-04-24 — released auf Hetzner als REL-016 (Asterisk + Call-Pipeline + SMAO vorbereitet, Internal-Test-Mode)
- V6.1 — 2026-04-21 — released auf Hetzner als REL-014 (Performance Premium UI)
- V6 — 2026-04-21 — released auf Hetzner als REL-013 (Performance-Tracking)

## Notes
18 Releases deployed (REL-001..REL-018). Technologie-Stack: Next.js + Supabase (self-hosted) + Bedrock Claude Sonnet (Frankfurt) + Jitsi/Jibri (shared Infra) + pgvector RAG + Asterisk PBX + Whisper-Adapter (openai-Default, Azure-EU Code-Ready ab V5.2) + E-Mail Composing Studio (V5.3). Hosting: Hetzner CPX32 via Coolify. V5.3 (E-Mail Composing Studio, REL-018) bringt Branding-Settings + 3-Panel-Compose + Systemvorlagen + KI-Generator + Inline-Edit-Diktat. V5.4 (in Planung) erweitert Composing-Studio um E-Mail-Anhaenge-Upload und schliesst V5.3-Hygiene-Themen (Color-Picker Toggle, ESLint, COMPLIANCE.md, Coolify-Crons) ab. Internal-Test-Mode bleibt aktiv bis Anwalts-Pruefung + Switch auf Azure-EU-Whisper. ISSUE-042 (OpenAI-Key in untrackter Datei, NIE committed) ist Pre-Pflicht vor erstem produktivem Whisper-Call.
