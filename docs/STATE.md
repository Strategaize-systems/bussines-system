# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: architecture
- Current Focus: V5.4 Architecture done 2026-04-28 — alle 8 PRD-Open-Questions in 8 DECs aufgeloest (DEC-097..104). MIG-025 geschnitten (Storage-Bucket `email-attachments` privat + Junction-Table `email_attachments` mit FK Cascade + Index + RLS). 2 Slices empfohlen: SLC-541 V5.4-Polish (5 MTs, ~3-4h, FEAT-541) und SLC-542 E-Mail-Anhaenge-Upload PC-Direkt (9 MTs, ~1-1.5 Tage, FEAT-542). Architekturleitplanken: Versand-Layer rueckwaertskompatibel, MIME-Whitelist als shared TS-Konstante, ZIP rein ohne Inhalt-Inspection, Color-Picker-Toggle als wiederverwendbare ConditionalColorPicker-Komponente, kein V5.4-Cleanup-Cron. /post-launch V5.3 laeuft passiv 24-48h.
- Current Phase: V5.4 Architecture done. Naechster Schritt /slice-planning V5.4.

## Immediate Next Steps
1. **/slice-planning V5.4** — 2 Slices SLC-541 + SLC-542 strukturiert ausdefinieren (Acceptance Criteria pro Slice, Micro-Tasks-Liste mit Reihenfolge, QA-Fokus, Cross-Slice-Dependencies, BL-Items + slices/INDEX.md aktualisieren).
2. **/backend SLC-541 V5.4-Polish** — ConditionalColorPicker-Komponente + /settings/branding-Form-Update + ESLint-Cleanup + COMPLIANCE.md V5.3-Section + Coolify-Cron-Cleanup-Doku in REL-019-Notes.
3. **/qa SLC-541** — Color-Picker-Toggle Live-Smoke + AC9-Verifikation + ESLint-Build-Output + Doku-Existenz-Check.
4. **/backend+frontend SLC-542 E-Mail-Anhaenge-Upload** — MIG-025 anwenden + Whitelist-Konstante + Server Actions + AttachmentsSection-UI + Multipart-Send + Live-Preview-Indikator + Junction-Table-Insert nach Send.
5. **/qa SLC-542** — MIME-Whitelist-Test (Browser+Server) + Size-Limit-Test + Drag&Drop + Multipart-Smoke an Gmail mit Tracking-Pixel-Event + Cadence-Engine-Regression-Check.
6. **Gesamt-/qa V5.4** → **/final-check** → **/go-live** → **/deploy** (manuell durch User in Coolify) → **/post-launch**.
7. **/post-launch V5.3 formaler Abschluss** — sobald 24-48h um sind und kein 500er aufgetreten. Kann parallel zu V5.4-Implementation laufen.
8. **Carryover (nicht V5.4-Scope):** ISSUE-042 OpenAI-Key Pre-Pflicht, Anwalts-Pruefung COMPLIANCE.md, Azure OpenAI EU + DPA + Switch, BL-397 GitHub-App Org-Anbindung, A5 SLC-531 Outlook-Smoke (User testet sobald Outlook-Postfach verfuegbar).

## Active Scope
**V5.4 — Composing-Studio Polish + E-Mail-Anhaenge (Requirements done 2026-04-28):**
- FEAT-541 V5.4-Polish (planned — Color-Picker AC9-Drift Fix + ESLint Hook-Order + COMPLIANCE.md V5.3-Update + Coolify-Cron-Cleanup)
- FEAT-542 E-Mail-Anhaenge-Upload PC-Direkt (planned — Drag&Drop, Storage-Bucket `email-attachments`, Junction-Table `email_attachments`, MIME/Size-Whitelist, Multipart-SMTP, Live-Preview-Indikator)

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
