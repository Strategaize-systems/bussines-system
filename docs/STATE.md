# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: qa
- Current Focus: V5.1 Final-Check abgeschlossen (RPT-201). Conditionally Ready fuer /go-live. Keine Blocker, keine Highs. Release-Bedingung: Internal-Test-Mode bis V5.2 Compliance-Sprint done (DEC-081). Code-Quality + Security sauber (tsc+eslint+secret-scan clean). Kein healthcheck auf asterisk-Service (Low).
- Current Phase: V5.1 Pre-Release (Final-Check done, /go-live offen)

## Immediate Next Steps
1. /go-live V5.1 — Release-Risk-Assessment mit expliziter Internal-Test-Mode-Bedingung + Coolify-Cron-Verifikation + Rollback-Plan
2. /deploy als REL-016 (User deployt manuell ueber Coolify, Cron-Setup-Tabelle liefern)
3. Nach V5.1-Deploy: /requirements V5.2 Compliance-Sprint (DEC-081) — Consent-Strategie + Retention-Defaults + Azure-Whisper + Call-Consent-Flow
4. Pre-SMAO-Go-Live (ausserhalb V5.1): ISSUE-041 fixen, SMAO_WEBHOOK_SECRET setzen, Parser gegen SMAO-Doku validieren

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
