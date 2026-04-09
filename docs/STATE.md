# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: slice-planning
- Current Focus: V3 Slice-Planning abgeschlossen. 10 Slices definiert. Naechster Schritt: Implementation (SLC-301 Schema-Migration zuerst).
- Current Phase: V3 Slice-Planning done → Implementation

## Immediate Next Steps
1. SLC-301 /backend — V3 Schema-Migration (MIG-005) auf Hetzner ausfuehren
2. SLC-303 /frontend — Navigation-Umbau (parallel zu SLC-301 moeglich)
3. SLC-304 /backend — Bedrock LLM-Service Layer (parallel zu SLC-301 moeglich)
4. /qa nach jedem Slice

## Active Scope
V3 Scope — Operative Kontextlogik (9 Features):
- FEAT-301: Deal-Workspace (eigene Route, KI-Briefing, Prozess-Check, Direktaktionen)
- FEAT-302: Mein Tag V2 (echte Kalender, Meeting-Prep, Exceptions, KI-Summary)
- FEAT-303: Firmen-Workspace Upgrade (Deal-Liste, KI-Slot)
- FEAT-304: Kontakt-Workspace Upgrade (Deal-Kontext, KI-Slot)
- FEAT-305: Bedrock LLM-Integration Layer (Service, Prompts, Confirm-before-write)
- FEAT-306: Navigation-Umbau (5-Schichten-Sidebar)
- FEAT-307: Governance-Basis (Rollen, RLS, Audit-Log)
- FEAT-308: Meeting-Management (eigene Tabelle, Timeline-Integration)
- FEAT-309: Kalender-Events (eigene Tabelle, Mein Tag Integration)

## Blockers
- aktuell keine

## Last Stable Version
- V2.2 — 2026-04-09 — deployed auf Hetzner (UI-Redesign + KI-Cockpit UI-Shells)

## Notes
V3 Discovery (RPT-033), Requirements (RPT-034), Architecture (RPT-035) und Slice-Planning (RPT-036) abgeschlossen. 10 Slices definiert (SLC-301 bis SLC-310) in 4 Phasen: Foundation → Data Layer → Workspaces → Polish. Empfohlener Start: SLC-301 (Schema-Migration), SLC-303 (Navigation) und SLC-304 (LLM-Service) parallel.
