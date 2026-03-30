# STATE

## Project
- Name: Strategaize Business System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Interne Business-Operations-Plattform die Marketing, Lead Generation und CRM in einem Skill-gesteuerten System vereint. Claude Code Skills erledigen die Arbeit, ein Next.js Cockpit liefert Sichtbarkeit. Pro Firma anpassbar.

## Current State
- High-Level State: go-live
- Current Focus: Final-Check + Go-Live bestanden. Deploy Prerequisites-Phase aktiv (Phase 1). Warte auf Hetzner/DNS/Env-Var Bestätigung.
- Current Phase: V1 Deployment — Prerequisites

## Immediate Next Steps
1. SLC-011: Deploy Prerequisites bestätigen (Hetzner, DNS, Env Vars, Coolify)
2. SLC-011: Build + Deploy auf Hetzner
3. Post-Launch Verifikation

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
Projekt folgt dem gleichen Pattern wie das Strategaize Dev System (Skills + Cockpit). 10 von 11 V1 Slices done, 20 von 29 Issues resolved, 0 Blocker. Zusätzlich: Voice Guide Skill + Anti-Slop-Regeln als V1.1 Backlog-Items. Deploy Skill wurde auf 3-Phasen-Modell (Prerequisites → Execute → Learn) umgebaut.
