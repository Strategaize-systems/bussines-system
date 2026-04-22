# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: released
- Current Focus: V5 released. Naechste Version: V7 (Multi-User + Erweiterung) oder neue Feature-Planung.
- Current Phase: Stable (V5 released)

## Immediate Next Steps
1. /post-launch V5 (Live-Monitoring, Cron-Verifikation)
2. Naechste Version planen (V7 oder neue Anforderungen)

## Active Scope
**V5 — Automatisierung + Vertriebsintelligenz (released 2026-04-22, REL-015):**
- FEAT-501 Cadences / Sequences — deployed
- FEAT-504 Intelligence-Platform-Export-API — deployed
- FEAT-505 E-Mail Auto-Zuordnung — deployed
- FEAT-506 E-Mail Open/Click-Tracking — deployed

**Released (deployed):**
- V2..V4.3, V5, V6, V6.1

**Planned:**
- V7 — Multi-User + Erweiterung (Routing, Teamlead, Workflow-Automation, Jigasi)

## Blockers
- aktuell keine

## Last Stable Version
- V5 — 2026-04-22 — deployed auf Hetzner (Automatisierung + Vertriebsintelligenz, 7/7 Slices, REL-015)

## Notes
15 Releases deployed (REL-001..REL-015). Technologie-Stack: Next.js + Supabase (self-hosted) + Bedrock Claude Sonnet (Frankfurt) + Jitsi/Jibri (shared Infra) + pgvector RAG. Hosting: Hetzner CPX32 via Coolify. Bedrock-Kosten kontrolliert durch on-click Pattern (DEC-313). Cal.com Self-Hosted mit Webhook-Integration (CALCOM_API_KEY bewusst leer, AGPLv3). OpenAI Whisper fuer Transkription (Azure-Migration geplant, DEC-035).
