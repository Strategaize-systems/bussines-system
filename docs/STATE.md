# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: released
- Current Focus: **V5.4 RELEASED** auf Hetzner als REL-019 (2026-04-29) auf Commit `c8637c6` (Refactor Anhang-Upload Server-Action → API-Route). 2 Slices done (SLC-541 V5.4-Polish + SLC-542 E-Mail-Anhaenge-Upload), 2 Features deployed (FEAT-541 + FEAT-542). MIG-025 live, Coolify-Cron-Cleanup via SQL durchgezogen (17 → 15 Crons, alle auf process.env.CRON_SECRET). Live-Smoke verifiziert: Multipart-Mail PDF+PNG+ZIP an Gmail empfangen, Junction-Rows + Tracking-Pixel-Open-Event 38s. 0 Blocker, 0 High, 0 Medium, 1 Low (ISSUE-045 akzeptiert). Internal-Test-Mode bleibt aktiv bis Anwalts-Pruefung COMPLIANCE.md + Switch auf Azure-OpenAI-EU. /post-launch V5.4 nach 24-48h Stable-Window. /post-launch V5.3 formaler Abschluss parallel faellig.
- Current Phase: V5.4 deployed. Naechster Schritt /post-launch nach Stable-Window.

## Immediate Next Steps
1. **Stable-Window-Beobachtung V5.4** 24-48h — Cron-Logs `imap-sync`/`embedding-sync`/`retention` pruefen ob nach Cleanup sauber laufen. Outlook-Compatibility-Smoke organisch beim ersten echten Outbound-Send.
2. **/post-launch V5.4** — formaler Abschluss nach Stable-Window.
3. **/post-launch V5.3 formaler Abschluss** — Stable-Window laengst abgelaufen, ueberfaellig.
4. **V5.4.x Patch-Carryover (optional, nicht release-blockierend):**
   - SLC-541 M1: ConditionalColorPicker Refactor zu derived-state (entfernt internes useState+useEffect, Verhalten identisch)
   - SLC-542 M1/ISSUE-045: Server-side Total-Size Limit (Client-Convenience → echtes Server-Enforcement, V5.5+ Operations-Topic)
   - SLC-542 L1: Filename-Kollision-Suffix-Pattern bei upsert
5. **Carryover (nicht V5.4-Scope):** ISSUE-042 OpenAI-Key Pre-Pflicht, Anwalts-Pruefung COMPLIANCE.md, Azure OpenAI EU + DPA + Switch, BL-397 GitHub-App Org-Anbindung, A5 SLC-531 Outlook-Smoke (User testet sobald Outlook-Postfach verfuegbar), BL-405 Angebot-Erstellung-Feature (V5.5+).

## Active Scope
**V5.4 — Composing-Studio Polish + E-Mail-Anhaenge (DEPLOYED 2026-04-29 als REL-019):**
- FEAT-541 V5.4-Polish (deployed — ConditionalColorPicker DEC-102 + ESLint Hook-Order Cleanup + COMPLIANCE.md V5.3+V5.4-Sections + Coolify-Cron-Cleanup durchgezogen)
- FEAT-542 E-Mail-Anhaenge-Upload PC-Direkt (deployed — MIG-025 live, Drag&Drop + File-Picker, Storage-Bucket privat, Junction-Table, ASCII-strict Sanitization, Multipart-SMTP via API-Route)

**Released (deployed):**
- V2..V4.3, V5, V5.1, V5.2, V5.3, V5.4, V6, V6.1

**Planned (Reihenfolge):**
- V5.5+ — BL-405 Angebot-Erstellung-Feature + BL-404 Teil 2 (Angebot-Anhang an E-Mail), eigene Requirements-Sequenz
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
