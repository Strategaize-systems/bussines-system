# STATE

## Project
- Name: Strategaize Business System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Strategaize-spezifische Business-Development-Instanz: CRM, Pipeline, Marketing-Cockpit, Redaktionskalender. Gebaut mit dem Dev System. Marketing-/Brand-Skills werden im Dev System gepflegt (Master) und hier als Kopien genutzt.

## Current State
- High-Level State: deployed
- Current Focus: V1 deployed auf Hetzner. Pipeline-Fehler + Seed-Daten prüfen. Skills in Dev System als Master verschoben.
- Current Phase: V1 Post-Launch

## Immediate Next Steps
1. Pipeline-Fehler debuggen (Seed-Daten fehlen?)
2. Temporäre Signup-Route entfernen
3. Post-Launch Verifikation aller Features

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
V1 deployed auf Hetzner (business.strategaizetransition.com). Login funktioniert, Dashboard lädt. Marketing-/Brand-/Voice-Skills sind jetzt im Dev System als Master — Business System behält Kopien in .claude/commands/ für lokale Nutzung. Wiederverwendbare Teile (Skills, SQL-Templates, Referenz-Daten) leben im Dev System unter .claude/skills-business/ und .claude/templates/crm-stack/.
