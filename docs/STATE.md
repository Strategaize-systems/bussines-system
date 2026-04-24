# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: qa
- Current Focus: V5.1 Gesamt-QA abgeschlossen (RPT-200). 5/5 Slices pass, 1 Enum-Dedupe inline gefixt, 1 offenes Medium (ISSUE-041 latent bei SMAO-Go-Live, nicht Release-blockierend), 1 interim-DEC (DEC-078 codec_opus). V5.1-Release ready fuer /final-check.
- Current Phase: V5.1 Pre-Release (Gesamt-QA done, /final-check offen)

## Immediate Next Steps
1. /final-check V5.1 — Hygiene, Dependencies, Security-Sweep
2. /go-live V5.1 — Release-Risk-Assessment + Coolify-Cron-Verifikation
3. /deploy als REL-016 (User deployt manuell ueber Coolify)
4. Pre-SMAO-Go-Live (ausserhalb V5.1): ISSUE-041 fixen, SMAO_WEBHOOK_SECRET setzen, Parser gegen SMAO-Doku validieren
5. Nach V5.1-Deploy: V5.2 Compliance-Sprint starten (DEC-081)

## Active Scope
**V5.1 — Asterisk Telefonie + SMAO Voice-Agent-Vorbereitung (requirements done):**
- FEAT-511 Asterisk PBX Deployment + SIP-Trunk-Adapter
- FEAT-512 Click-to-Call aus Deal-Workspace
- FEAT-513 Anruf-Aufnahme → Whisper → Summary → Deal-Activity
- FEAT-514 SMAO Voice-Agent Adapter (vorbereitet)

**Released (deployed):**
- V2..V4.3, V5, V6, V6.1

**Planned:**
- V5.2 — E-Mail Composing Studio (3-Panel)
- V7 — Multi-User + Erweiterung

## Blockers
- aktuell keine

## Last Stable Version
- V5 — 2026-04-22 — deployed auf Hetzner (Automatisierung + Vertriebsintelligenz, REL-015)

## Notes
15 Releases deployed (REL-001..REL-015). Technologie-Stack: Next.js + Supabase (self-hosted) + Bedrock Claude Sonnet (Frankfurt) + Jitsi/Jibri (shared Infra) + pgvector RAG. Hosting: Hetzner CPX32 via Coolify. V5.1 bringt Asterisk als eigene Telefonanlage + SMAO Voice-Agent-Vorbereitung. Kein externer Kostenblock in V5.1 — SIP-Trunk + SMAO-Account werden erst bei Go-Live aktiviert.
