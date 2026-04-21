# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: implementing
- Current Focus: V5 Implementierung. SLC-501..503 done (3/7). Naechster Schritt: /qa SLC-503, dann /backend SLC-504 (Cadence-Backend).
- Current Phase: V5 Implementation (3/7 Slices done)

## Immediate Next Steps
1. /qa SLC-503
2. /backend SLC-504 (Cadence-Backend)
3. /frontend SLC-505 (Cadence-Frontend)

## Active Scope
**V5 — Automatisierung + Vertriebsintelligenz (active, Requirements done):**
- FEAT-501 Cadences / Sequences — Follow-up-Ketten automatisieren
- FEAT-505 E-Mail Auto-Zuordnung — IMAP → Kontakt-Match (3 Stufen)
- FEAT-506 E-Mail Open/Click-Tracking — Pixel + Link-Wrapping
- FEAT-504 Intelligence-Platform-Export-API — 5 JSON-Endpoints fuer System 4

**Released (deployed):**
- V2..V4.3, V6, V6.1

**Planned:**
- V7 — Multi-User + Erweiterung (Routing, Teamlead, Workflow-Automation, Jigasi)

## Blockers
- aktuell keine

## Last Stable Version
- V6.1 — 2026-04-21 — deployed auf Hetzner (Performance Premium UI, 3/3 Slices, REL-014)

## Notes
14 Releases deployed (REL-001..REL-014). Technologie-Stack: Next.js + Supabase (self-hosted) + Bedrock Claude Sonnet (Frankfurt) + Jitsi/Jibri (shared Infra) + pgvector RAG. Hosting: Hetzner CPX32 via Coolify. Bedrock-Kosten kontrolliert durch on-click Pattern (DEC-313). Cal.com Self-Hosted mit Webhook-Integration (CALCOM_API_KEY bewusst leer, AGPLv3). OpenAI Whisper fuer Transkription (Azure-Migration geplant, DEC-035).
