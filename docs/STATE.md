# STATE

## Project
- Name: Strategaize Business System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Interne Business-Operations-Plattform die Marketing, Lead Generation und CRM in einem Skill-gesteuerten System vereint. Claude Code Skills erledigen die Arbeit, ein Next.js Cockpit liefert Sichtbarkeit. Pro Firma anpassbar.

## Current State
- High-Level State: implementing
- Current Focus: SLC-005 Aktivitäten + Dokumente abgeschlossen. 7 von 11 Slices done. Nächster: SLC-006.
- Current Phase: V1 Implementation

## Immediate Next Steps
1. SLC-006: Dashboard
2. SLC-007: Redaktionskalender
3. SLC-010: Brand System Skill

## Active Scope
V1 Scope (5 Features, 11 Slices):
- FEAT-001: CRM-Datenbasis → SLC-002, SLC-003, SLC-005
- FEAT-002: Pipeline-Management → SLC-004
- FEAT-003: Business Cockpit Dashboard → SLC-001, SLC-006, SLC-007
- FEAT-004: Kern-Marketing-Skills → SLC-008, SLC-009
- FEAT-005: Brand System → SLC-010
- Deployment → SLC-011
- Tech: Fresh Next.js + Supabase (Blueprint-Pattern), NextCRM als Referenz
- Hosting: Hetzner CX31, Coolify, business.strategaizetransition.com

## Blockers
- aktuell keine

## Last Stable Version
- none yet

## Notes
Projekt folgt dem gleichen Pattern wie das Strategaize Dev System (Skills + Cockpit). Recherche hat ergeben, dass ~70% der Bausteine als Open Source existieren (Skill-Libraries, MCP-Server, Self-Hosted-Tools). ~30% muss selbst gebaut werden (Cockpit, Skill-Orchestrierung, Datenmodell).
