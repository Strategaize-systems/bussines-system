# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: requirements
- Current Focus: V3 Requirements — Operative Kontextlogik. Discovery abgeschlossen, 6 Architekturentscheidungen bestaetigt (DEC-021 bis DEC-026).
- Current Phase: V3 Requirements

## Immediate Next Steps
1. /requirements fuer V3 — Features und Akzeptanzkriterien definieren
2. V3 Scope: Deal-Workspace, Mein Tag, Firmen-/Kontakt-Workspace, Bedrock LLM, Navigation-Umbau, Governance-Basis
3. Architektur nach Requirements

## Active Scope
V3 Scope — Operative Kontextlogik:
- Deal-Workspace als eigene Seite (DEC-022) mit KI-Briefing (DEC-023), Prozess-Check, Direktaktionen
- Mein Tag: echte Kalender-Daten (DEC-026), Meeting-Prep, Exception-Hinweise, erste KI-Funktion
- Firmen-/Kontakt-Workspace erweitern (Deal-Liste, KI-Slot)
- Bedrock LLM-Integration Layer (DEC-018 + DEC-023)
- Navigation umstrukturieren (5-Schichten-Modell)
- Governance-Basis: Rollen (operator/admin), Basis-RLS, Audit-Log (DEC-024)
- Neue Tabellen: calendar_events (DEC-026), audit_log (DEC-024), meetings (DEC-021)
- Activities erweitern: source_type + source_id (DEC-021)

## Blockers
- aktuell keine

## Last Stable Version
- V2.2 — 2026-04-09 — deployed auf Hetzner (UI-Redesign + KI-Cockpit UI-Shells)

## Notes
V2.2 abgeschlossen und released. Offene UI-Items (BL-212 bis BL-215) in V3-Backlog uebernommen. Strategische Neuausrichtung: Vom Feature-CRM zum kontextzentrierten BD-Betriebssystem mit 5-Schichten-Architektur (Operativ, Analyse, Prozesslogik, Wissen, Fallback). Discovery (RPT-033) dokumentiert Gap-Analyse und bestaetigt Phasenstruktur V3/V3.1/V4/V5. 4-System-Landschaft: System 1 (Blueprint), System 2 (Operating System), System 3 (Business Development = dieses System), System 4 (Intelligence Studio).
