# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: implementing
- Current Focus: V5.2 Compliance-Sprint Implementation laeuft 2026-04-25. SLC-521 + SLC-522 + SLC-523 done. SLC-523 als Vertical Slice (DB + Backend + Frontend) fertig: MIG-022 auf Hetzner angewendet (Tabelle compliance_templates mit 3 Default-Rows), `/settings/compliance` Page mit 3 Template-Bloecken (Edit/Copy/Reset), Mini-Variablen-Engine in `lib/compliance/variables.ts` (8 Unit-Tests gruen). Naechster Schritt: /qa SLC-523.
- Current Phase: V5.2 Implementation 3/5 Slices done. Pre-Go-Live-Tasks (Smoke-Test V5.1, post-launch V5.1) parallel offen.

## Immediate Next Steps
1. /qa SLC-523 — DB-Verifikation auf Hetzner, Page-Render-Test in Browser, Edit+Save+Reload Round-Trip, Reset-Button, Copy-to-Clipboard, RLS-Check.
2. /frontend SLC-524 (MeetingTimelineItem) — ~1 Tag, UI-only Parity zu CallTimelineItem.
3. /docs SLC-525 (DSGVO-Compliance-Doku) — LAST, nach SLC-521..524 done, ~0.5 Tag.
4. Gesamt-/qa V5.2 nach allen 5 Slices done, dann /final-check + /go-live + /deploy + /post-launch in einem Rutsch.
5. Smoke-Test V5.1 nach User-Redeploy (parallel zu V5.2-Implementierung): Echo-Test 600, Webhook-Disabled-Check (404), Call-Timeline-Render, Retention-Cron-Log
6. /post-launch V5.1 nach 24-48h Live-Beobachtung
7. Pre-Go-Live (vor erstem externen Recording, ausserhalb V5.2): Azure-Account anlegen, AZURE_OPENAI_*-ENVs in Coolify setzen, TRANSCRIPTION_PROVIDER auf azure umstellen

## Active Scope
**V5.1 — Asterisk Telefonie + SMAO Voice-Agent-Vorbereitung (released, Internal-Test-Mode):**
- FEAT-511 Asterisk PBX Deployment + SIP-Trunk-Adapter (deployed)
- FEAT-512 Click-to-Call aus Deal-Workspace (deployed)
- FEAT-513 Anruf-Aufnahme → Whisper → Summary → Deal-Activity (deployed)
- FEAT-514 SMAO Voice-Agent Adapter (deployed, vorbereitet, SMAO_ENABLED=false)

**Released (deployed):**
- V2..V4.3, V5, V5.1, V6, V6.1

**Active:**
- V5.2 — Compliance-Sprint (DEC-081): 5 Features (FEAT-521..525), Requirements done 2026-04-25. Retention 7d, Azure-Whisper Code-Ready, Einwilligungstexte+Settings, MeetingTimelineItem-Parity, DSGVO-Doku. Vorbereitung fuer V5.1 SMAO-Go-Live.

**Planned (Reihenfolge):**
- V5.3 — E-Mail Composing Studio (BL-386, urspruenglich V5.2, durch Compliance-Sprint nachgelagert)
- V7 — Multi-User + Erweiterung

## Blockers
- aktuell keine

## Last Stable Version
- V5.1 — 2026-04-24 — released auf Hetzner als REL-016 (Asterisk + Call-Pipeline + SMAO vorbereitet, Internal-Test-Mode)
- V6.1 — 2026-04-21 — released auf Hetzner als REL-014 (Performance Premium UI)
- V6 — 2026-04-21 — released auf Hetzner als REL-013 (Performance-Tracking)
- V5 — 2026-04-22 — released auf Hetzner als REL-015 (Automatisierung + Vertriebsintelligenz)

## Notes
16 Releases deployed (REL-001..REL-016). Technologie-Stack: Next.js + Supabase (self-hosted) + Bedrock Claude Sonnet (Frankfurt) + Jitsi/Jibri (shared Infra) + pgvector RAG + Asterisk PBX + Whisper-Adapter. Hosting: Hetzner CPX32 via Coolify. V5.1 bringt Asterisk als eigene Telefonanlage + SMAO Voice-Agent-Vorbereitung. Kein externer Kostenblock — SIP-Trunk + SMAO-Account werden erst bei Go-Live aktiviert. V5.2 wurde per DEC-081 zu Compliance-Sprint umgewidmet (vorgezogen vor E-Mail Composing Studio).
