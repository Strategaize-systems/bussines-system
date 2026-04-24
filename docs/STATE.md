# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: qa
- Current Focus: SLC-515 SMAO Voice-Agent Adapter implementiert + /qa durchgelaufen (RPT-198, RPT-199). 11/11 AC statisch erfuellt, 1 Cross-System-Medium ISSUE-041 dokumentiert (Cron-Interferenz bei SMAO_ENABLED=true, nicht V5.1-Release-blockierend). V5.1 Slice-Scope ready, naechster Schritt: Gesamt-QA V5.1 ueber alle 5 Slices.
- Current Phase: V5.1 QA-Phase (5/5 Slices implementiert, Gesamt-QA ausstehend)

## Immediate Next Steps
1. /qa V5.1 Gesamt (alle 5 Slices zusammen)
2. /final-check V5.1 → /go-live → /deploy REL-016
3. Pre-SMAO-Go-Live (ausserhalb V5.1): ISSUE-041 fixen, SMAO_WEBHOOK_SECRET setzen, Parser gegen SMAO-Doku validieren
4. Nach V5.1-Deploy: V5.2 Compliance-Sprint starten (DEC-081)

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
