# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: released
- Current Focus: V5.1 released als REL-016 (2026-04-24, Internal-Test-Mode bis V5.2 Compliance-Sprint per DEC-081). ISSUE-041 (Pre-SMAO-Cron-Filter) am 2026-04-25 als Mini-Fix gemerged. Naechster Schritt: V5.2 Compliance-Sprint requirements. Cockpit-Records am 2026-04-25 vollstaendig synchronisiert (5/5 V5.1-Backlog-Items auf done).
- Current Phase: V5.1 Released (REL-016 live, Smoke-Test User-seitig offen, post-launch pending)

## Immediate Next Steps
1. /requirements V5.2 Compliance-Sprint (DEC-081) — Organisatorische Consent-Strategie + Retention 30→7 Tage + Azure-Whisper EU + Einwilligungstexte + MeetingTimelineItem-Parity
2. Smoke-Test V5.1 nach User-Redeploy: Echo-Test 600, Webhook-Disabled-Check (404), Call-Timeline-Render, Asterisk PJSIP-Endpoints, Retention-Cron-Log
3. /post-launch V5.1 nach 24-48h Live-Beobachtung
4. Pre-SMAO-Go-Live (ausserhalb V5.1): SMAO_WEBHOOK_SECRET setzen, Parser gegen SMAO-Doku validieren (ISSUE-041 erledigt 2026-04-25)

## Active Scope
**V5.1 — Asterisk Telefonie + SMAO Voice-Agent-Vorbereitung (released, Internal-Test-Mode):**
- FEAT-511 Asterisk PBX Deployment + SIP-Trunk-Adapter (deployed)
- FEAT-512 Click-to-Call aus Deal-Workspace (deployed)
- FEAT-513 Anruf-Aufnahme → Whisper → Summary → Deal-Activity (deployed)
- FEAT-514 SMAO Voice-Agent Adapter (deployed, vorbereitet, SMAO_ENABLED=false)

**Released (deployed):**
- V2..V4.3, V5, V5.1, V6, V6.1

**Planned (Reihenfolge):**
- V5.2 — Compliance-Sprint (DEC-081): Consent-Strategie, 7d Retention, Azure-Whisper EU, Einwilligungstexte, MeetingTimelineItem-Parity. Vorbereitung fuer V5.1 SMAO-Go-Live.
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
