# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: implementing
- Current Focus: V5.4 SLC-541 V5.4-Polish vollstaendig durch (Backend + QA) 2026-04-28 — Implementation aus RPT-242 + QA-Verifikation in RPT-243 (PASS, 12/12 ACs Code-verifiziert, 1 Medium-Finding M1 ConditionalColorPicker useEffect-set-state-Pattern als V5.4.x-Patch-Empfehlung, kein Blocker). slices/INDEX SLC-541 → done, features/INDEX FEAT-541 → done, BL-396 + BL-406 → done, ISSUE-043 resolved (DEC-102 Conditional-Color-Picker). User-Live-Smoke (`/settings/branding` Toggle-Test + AC9-Bit-Identitaet realer Mail-Versand + visueller 2-Dialog-Smoke) verbleibt als Pre-Deploy-Schritt. /post-launch V5.3 laeuft passiv 24-48h. Naechster Slice: SLC-542 E-Mail-Anhaenge-Upload (PC-Direkt) als /backend.
- Current Phase: V5.4 SLC-541 done (1/2 V5.4-Slices). Naechster Schritt /backend SLC-542.

## Immediate Next Steps
1. **/backend+frontend SLC-542 E-Mail-Anhaenge-Upload** — 9 Micro-Tasks: MT-1 MIG-025 anwenden auf Hetzner + MT-2 attachments-whitelist.ts + MT-3 Server Actions (upload+delete) + MT-4 AttachmentsSection-UI + MT-5 Compose-Form-Integration + MT-6 Live-Preview-Indikator + MT-7 send.ts Multipart-Erweiterung + MT-8 sendComposedEmail-Update + Junction-Insert + MT-9 Smoke-Test 3 Faelle + Cadence-Regression. Schaetzung ~1-1.5 Tage.
2. **/qa SLC-542** — MIME-Whitelist-Test (Browser+Server) + Size-Limit-Test + Drag&Drop + Multipart-Smoke an Gmail mit Tracking-Pixel-Event + Cadence-Engine-Regression-Check.
3. **Pre-Deploy User-Live-Smoke SLC-541** — `/settings/branding` Toggle-Verhalten + AC9-Bit-Identitaet (User mit `primary_color=NULL` sendet Mail, Output muss `textToHtml`-Fallback sein) + visueller Smoke der 2 Dialoge. Browser-Test gegen Hetzner.
4. **Gesamt-/qa V5.4** → **/final-check** → **/go-live** → **/deploy** (manuell durch User in Coolify) → **/post-launch**.
5. **/post-launch V5.3 formaler Abschluss** — sobald 24-48h um sind und kein 500er aufgetreten. Kann parallel zu V5.4-Implementation laufen.
6. **V5.4.x Patch-Carryover (optional, nicht release-blockierend):** M1 ConditionalColorPicker Refactor zu derived-state (entfernt internes useState+useEffect, Verhalten identisch).
7. **Carryover (nicht V5.4-Scope):** ISSUE-042 OpenAI-Key Pre-Pflicht, Anwalts-Pruefung COMPLIANCE.md, Azure OpenAI EU + DPA + Switch, BL-397 GitHub-App Org-Anbindung, A5 SLC-531 Outlook-Smoke (User testet sobald Outlook-Postfach verfuegbar).

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
