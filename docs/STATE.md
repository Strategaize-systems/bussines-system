# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: requirements
- Current Focus: V5.4 Requirements done 2026-04-28 — Composing-Studio Polish + E-Mail-Anhaenge in 2 Features (FEAT-541 V5.4-Polish, FEAT-542 E-Mail-Anhaenge-Upload PC-Direkt). PRD V5.4-Section angelegt mit Problem/Goal/Vision/Scope/AC/OutOfScope/Constraints/Risks/Success-Criteria/OpenQuestions. 8 Open Questions zur Architecture-Entscheidung (Junction-Table-Schema, Storage-Path-Struktur, Compose-Session-Lebensdauer, Whitelist-Konstante-Sharing, Tracking-Pixel bei Multipart, Compose-Form-Integration, Polish-Slicing). V5.3 ist released (REL-018 2026-04-28), bleibt im Cockpit als deployed sichtbar. V5.4-Plan: 2 Slices nacheinander (SLC-541 Polish → /qa → SLC-542 Anhaenge → /qa → Gesamt-/qa → /final-check → /go-live → /deploy).
- Current Phase: V5.4 Requirements done. Naechster Schritt /architecture V5.4. /post-launch V5.3 laeuft passiv 24-48h, formaler Abschluss separat.

## Immediate Next Steps
1. **/architecture V5.4** — 8 Open Questions klaeren (Junction-Table-Schema, Storage-Path, Compose-Session-Lebensdauer, Whitelist-Konstante, Tracking-Pixel-Multipart, UI-Integration, Polish-Slicing, MIG-025-Schnitt). DECs schreiben fuer Storage-Bucket-Pattern + Color-Picker-Toggle + ZIP-Inhalt-Inspection-Verzicht.
2. **/slice-planning V5.4** — 2 Slices SLC-541 + SLC-542 mit Micro-Tasks zuschneiden.
3. **/backend SLC-541 V5.4-Polish** — Color-Picker-Toggle + ESLint-Cleanup + COMPLIANCE.md V5.3-Section + Coolify-Cron-Cleanup-Doku.
4. **/qa SLC-541** — Static + Live-Smoke + Tracking-Regression-Check.
5. **/backend+frontend SLC-542 E-Mail-Anhaenge-Upload** — MIG-025 + Bucket + Junction-Table + Compose-Form-UI + Multipart-Send + Live-Preview-Indikator.
6. **/qa SLC-542** — MIME-Whitelist-Test + Size-Limit-Test + Tracking-Regression mit Anhang + Multipart-Smoke an Gmail.
7. **Gesamt-/qa V5.4** → **/final-check** → **/go-live** → **/deploy** (manuell durch User in Coolify) → **/post-launch**.
8. **/post-launch V5.3 formaler Abschluss** — sobald 24-48h um sind und kein 500er aufgetreten. Kann parallel zu V5.4-Implementation laufen.
9. **Carryover (nicht V5.4-Scope):** ISSUE-042 OpenAI-Key Pre-Pflicht, Anwalts-Pruefung COMPLIANCE.md, Azure OpenAI EU + DPA + Switch, BL-397 GitHub-App Org-Anbindung, A5 SLC-531 Outlook-Smoke (User testet sobald Outlook-Postfach verfuegbar).

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
