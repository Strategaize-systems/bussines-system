# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: stable
- Current Focus: V6.1 released + post-launch STABLE (RPT-179). Vollstaendiger Lifecycle abgeschlossen.
- Current Phase: Stable (V6.1)

## Immediate Next Steps
1. Naechste Version planen

## Active Scope
Alle Versionen bis V6.1 sind released und deployed. Naechste geplante Version: V5 (Automatisierung + Skalierung) oder neues Feature nach Bedarf.

**Released Versions (aktuell deployed):**
- V2..V3.3 — CRM-Basis, Workspaces, KI-Integration, UI-Polish
- V4..V4.3 — IMAP, KI-Gatekeeper, Cal.com, Meeting Intelligence, Wissensbasis RAG, Insight Governance
- V6 — Zielsetzung + Performance-Tracking (10 Slices, REL-013)
- V6.1 — Performance Premium UI (3 Slices, REL-014)

**Planned:**
- V5 — Automatisierung + Skalierung (Cadences, Routing, Teamlead-Rolle, Export-API)

## Blockers
- aktuell keine

## Last Stable Version
- V6.1 — 2026-04-21 — deployed auf Hetzner (Performance Premium UI, 3/3 Slices, REL-014)

## Notes
14 Releases deployed (REL-001..REL-014). Technologie-Stack: Next.js + Supabase (self-hosted) + Bedrock Claude Sonnet (Frankfurt) + Jitsi/Jibri (shared Infra) + pgvector RAG. Hosting: Hetzner CPX32 via Coolify. Bedrock-Kosten kontrolliert durch on-click Pattern (DEC-313). Cal.com Self-Hosted mit Webhook-Integration (CALCOM_API_KEY bewusst leer, AGPLv3). OpenAI Whisper fuer Transkription (Azure-Migration geplant, DEC-035).
