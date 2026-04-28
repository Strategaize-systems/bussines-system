# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: slice-planning
- Current Focus: V5.4 Slice-Planning done 2026-04-28 — 2 Slice-Spec-Files erzeugt (SLC-541 V5.4-Polish mit 5 MTs + 12 ACs, SLC-542 E-Mail-Anhaenge-Upload PC-Direkt mit 9 MTs + 15 ACs). slices/INDEX.md mit V5.4-Section (beide planned, High-Priority). Files-to-Touch komplett: 4 modifizierte + 6 neue Code-Dateien fuer SLC-541, 13 modifizierte + 5 neue Code-Dateien fuer SLC-542. QA-Fokus pro Slice klar. Cross-Slice-Dependencies minimal (SLC-542 setzt SLC-541 nicht voraus, aber wir gehen sequenziell durch). /post-launch V5.3 laeuft passiv 24-48h.
- Current Phase: V5.4 Slice-Planning done. Naechster Schritt /backend SLC-541.

## Immediate Next Steps
1. **/backend SLC-541 V5.4-Polish** — 5 Micro-Tasks: MT-1 ConditionalColorPicker-Komponente + MT-2 /settings/branding-Form-Update + MT-3 ESLint Hook-Order Cleanup + MT-4 COMPLIANCE.md V5.3-Section + MT-5 REL-019-Notes mit Coolify-Cron-Cleanup-Anleitung. Schaetzung ~3-4h.
2. **/qa SLC-541** — Color-Picker-Toggle Live-Smoke + AC9-Verifikation (FEAT-531-Bit-Identitaet) + ESLint-Build-Output + COMPLIANCE.md/REL-019-Existenz-Checks + TypeScript-Build.
3. **/backend+frontend SLC-542 E-Mail-Anhaenge-Upload** — 9 Micro-Tasks: MT-1 MIG-025 anwenden auf Hetzner + MT-2 attachments-whitelist.ts + MT-3 Server Actions (upload+delete) + MT-4 AttachmentsSection-UI + MT-5 Compose-Form-Integration + MT-6 Live-Preview-Indikator + MT-7 send.ts Multipart-Erweiterung + MT-8 sendComposedEmail-Update + Junction-Insert + MT-9 Smoke-Test 3 Faelle + Cadence-Regression. Schaetzung ~1-1.5 Tage.
4. **/qa SLC-542** — MIME-Whitelist-Test (Browser+Server) + Size-Limit-Test + Drag&Drop + Multipart-Smoke an Gmail mit Tracking-Pixel-Event + Cadence-Engine-Regression-Check.
5. **Gesamt-/qa V5.4** → **/final-check** → **/go-live** → **/deploy** (manuell durch User in Coolify) → **/post-launch**.
6. **/post-launch V5.3 formaler Abschluss** — sobald 24-48h um sind und kein 500er aufgetreten. Kann parallel zu V5.4-Implementation laufen.
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
