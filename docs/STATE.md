# STATE

## Project
- Name: Strategaize Business System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Interne Business-Operations-Plattform die Marketing, Lead Generation und CRM in einem Skill-gesteuerten System vereint. Claude Code Skills erledigen die Arbeit, ein Next.js Cockpit liefert Sichtbarkeit. Pro Firma anpassbar.

## Current State
- High-Level State: implementing
- Current Focus: 5 von 11 Slices gebaut, QA hat 2 Blocker + 4 High Issues gefunden. Blocker fixen vor weiterem Fortschritt.
- Current Phase: V1 Implementation — QA-Korrekturrunde

## Immediate Next Steps
1. ISSUE-001 fixen: Dockerfile für Cockpit erstellen
2. ISSUE-002 fixen: Dockerfile.kong für Kong Env-Substitution
3. ISSUE-003 fixen: Dockerfile.db für Supabase-Rollen
4. ISSUE-004/005 fixen: Edit-UI für Kontakte und Firmen
5. ISSUE-006 klären: Skill-Registrierung (.claude/skills/ vs /skills/)
6. Dann SLC-004: Pipeline + Kanban

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
- ISSUE-001: Dockerfile für Cockpit fehlt (Docker Compose kann nicht bauen)
- ISSUE-002: Dockerfile.kong fehlt (Kong Auth-Keys nicht substituiert)
- ISSUE-003: Supabase DB Init-Scripts werden überschrieben (Rollen fehlen)

## Last Stable Version
- none yet

## Notes
Projekt folgt dem gleichen Pattern wie das Strategaize Dev System (Skills + Cockpit). Recherche hat ergeben, dass ~70% der Bausteine als Open Source existieren (Skill-Libraries, MCP-Server, Self-Hosted-Tools). ~30% muss selbst gebaut werden (Cockpit, Skill-Orchestrierung, Datenmodell).
