# SLC-208 — Lead-Management-Pipeline

## Meta
- Feature: BL-127
- Priority: Medium
- Status: planned
- Dependencies: SLC-201

## Goal
Dritte Pipeline für Marketing-Outreach. Trackt Anschreibe-Aktionen und Lead-Qualifizierung.

## Scope
- Neue Pipeline "Lead-Management" mit 7 Stages (Identifiziert → Angeschrieben → Follow-up 1/2/3 → Reagiert → Qualifiziert)
- Seed-Daten SQL
- Sidebar-Eintrag unter Pipeline-Gruppe
- Route /pipeline/leads
- "In Pipeline verschieben" Aktion (Lead → Multiplikatoren oder Unternehmer Pipeline)

## Out of Scope
- Automatisches Anschreiben
- E-Mail-Sequenzen (V2.2 BL-129)

### Micro-Tasks

#### MT-1: Pipeline + Stages Seed SQL
- Goal: Lead-Management Pipeline mit 7 Stages in DB anlegen
- Files: `sql/07_v21_lead_pipeline.sql`
- Expected behavior: Neue Pipeline mit Stages sichtbar
- Verification: SQL läuft ohne Fehler
- Dependencies: none

#### MT-2: Route + Sidebar
- Goal: /pipeline/leads Route und Sidebar-Eintrag
- Files: `cockpit/src/app/(app)/pipeline/leads/page.tsx`, `cockpit/src/components/layout/sidebar.tsx`
- Expected behavior: Lead-Pipeline als Kanban sichtbar
- Verification: Build OK
- Dependencies: MT-1

#### MT-3: "In Pipeline verschieben" Aktion
- Goal: Deal von Lead-Pipeline in andere Pipeline verschieben
- Files: `cockpit/src/app/(app)/pipeline/actions.ts`
- Expected behavior: Deal bekommt neue pipeline_id + stage_id
- Verification: Build OK
- Dependencies: MT-2
