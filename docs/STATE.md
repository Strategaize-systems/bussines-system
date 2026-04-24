# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: qa
- Current Focus: SLC-515 SMAO Voice-Agent Adapter implementiert (RPT-198). VoiceAgentProvider-Interface + SMAO/Synthflow-Adapter + Webhook-Endpoint + Klassifikations-Aktionen (urgent→Push, callback/meeting_request→Task, info→Activity). Dialplan-Routing bereits in SLC-512 korrekt verdrahtet (SMAO_ENABLED globals + [smao-endpoint] bei true). Keine Migration. TypeScript build clean.
- Current Phase: V5.1 QA-Phase (5/5 Slices implementiert, Gesamt-QA ausstehend)

## Immediate Next Steps
1. /qa SLC-515 (einzeln) — Acceptance-Criteria AC1..AC11 pruefen, curl-Smoke-Test
2. /qa V5.1 Gesamt (alle 5 Slices zusammen) vor /final-check
3. /final-check V5.1 → /go-live → /deploy REL-016

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
