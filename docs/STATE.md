# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: qa
- Current Focus: V5.4 vollstaendig durch (2/2 Slices done auf Code/Migration-Ebene) 2026-04-28 — SLC-541 V5.4-Polish (RPT-242+243) + SLC-542 E-Mail-Anhaenge-Upload (RPT-244+245). MIG-025 live auf Hetzner verifiziert. Beide Slices QA-PASS Code-Ebene; 2 User-Live-Smokes verbleiben als Pre-Deploy-Pflicht (SLC-541: Toggle + AC9 + Dialog-Smoke; SLC-542: 9-Punkt-Smoke inkl. Multipart-Mail PDF/PNG/ZIP an Gmail + Tracking-Pixel + Cadence-Regression). Findings: SLC-541 M1 (ConditionalColorPicker useEffect-set-state, V5.4.x-Patch); SLC-542 M1/ISSUE-045 (Server-side Total-Size Limit Client-Convenience, V5.5+ Operations) + L1 (Filename-Kollision bei upsert). 0 Blocker, 0 High. tsc 0, ESLint clean, Vitest 35/35, Next-Build gruen. /post-launch V5.3 laeuft passiv 24-48h.
- Current Phase: V5.4 QA-Code-PASS. Naechster Schritt: Pre-Deploy User-Live-Smoke + Gesamt-/qa V5.4 + /final-check.

## Immediate Next Steps
1. **Pre-Deploy User-Live-Smoke V5.4** — Browser-Test gegen Hetzner. SLC-541-Block (3 Schritte): `/settings/branding` Toggle-Verhalten + AC9-Bit-Identitaet (Mail mit `primary_color=NULL` muss `textToHtml`-Fallback sein) + visueller 2-Dialog-Smoke (NewTemplateDialog + InlineEditDialog open/close/reset). SLC-542-Block (9 Schritte aus RPT-245): MIME-Whitelist Browser+Server + Size-Limits + Drag&Drop + Loeschen + Multipart-Mail an Gmail (PDF + PNG + ZIP, Tracking-Pixel-Event-Verifikation in `email_tracking_events`) + Cadence-Engine-Regression-Check + Junction-Table-Insert-Verifikation + Verwaiste-Files-Beobachtung.
2. **Gesamt-/qa V5.4** → **/final-check** → **/go-live** → **/deploy** (manuell durch User in Coolify) → **/post-launch**.
3. **/post-launch V5.3 formaler Abschluss** — sobald 24-48h um sind und kein 500er aufgetreten. Kann parallel zu V5.4-Pre-Deploy-Smoke laufen.
4. **V5.4.x Patch-Carryover (optional, nicht release-blockierend):**
   - SLC-541 M1: ConditionalColorPicker Refactor zu derived-state (entfernt internes useState+useEffect, Verhalten identisch)
   - SLC-542 M1/ISSUE-045: Server-side Total-Size Limit (Client-Convenience → echtes Server-Enforcement, V5.5+ Operations-Topic)
   - SLC-542 L1: Filename-Kollision-Suffix-Pattern bei upsert
5. **Carryover (nicht V5.4-Scope):** ISSUE-042 OpenAI-Key Pre-Pflicht, Anwalts-Pruefung COMPLIANCE.md, Azure OpenAI EU + DPA + Switch, BL-397 GitHub-App Org-Anbindung, A5 SLC-531 Outlook-Smoke (User testet sobald Outlook-Postfach verfuegbar), BL-405 Angebot-Erstellung-Feature (V5.5+).

## Active Scope
**V5.4 — Composing-Studio Polish + E-Mail-Anhaenge (Code done 2026-04-28, Pre-Deploy User-Live-Smoke offen):**
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
