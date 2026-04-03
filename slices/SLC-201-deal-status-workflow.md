# SLC-201 — Deal-Status-Workflow + Activity-Logging

## Meta
- Feature: BL-117, BL-120, BL-123
- Priority: Blocker
- Status: planned
- Dependencies: none

## Goal
Deals bekommen einen funktionalen Status-Lifecycle (active → won/lost). Auto-Status bei Stage-Wechsel zu Gewonnen/Verloren. Alle Deal-Mutationen werden als Activities geloggt. DB-Cleanup.

## Scope
- moveDealToStage: Auto-Status won/lost bei Terminal-Stages
- Deal-Form: Status-Feld sichtbar (active/won/lost)
- closed_at Timestamp bei Status-Wechsel
- Activity-Logging für createDeal, updateDeal, deleteDeal
- DB-Migration: lost_reason entfernen, referral_source_id FK, created_by setzen

## Out of Scope
- Deal-Detail-Seite (SLC-202)
- Pipeline-Filter (SLC-204)

### Micro-Tasks

#### MT-1: DB-Migration Script (lost_reason drop, FK, closed_at)
- Goal: Schema bereinigen und closed_at Feld hinzufügen
- Files: `sql/06_v21_deal_status.sql`
- Expected behavior: Idempotentes Migration-Script
- Verification: Script ausführbar ohne Fehler
- Dependencies: none

#### MT-2: Deal Actions — Status-Workflow
- Goal: moveDealToStage setzt automatisch status won/lost. updateDeal akzeptiert status. closed_at wird gesetzt.
- Files: `cockpit/src/app/(app)/pipeline/actions.ts`
- Expected behavior: Deal in "Gewonnen" ziehen → status="won", closed_at=now()
- Verification: Build OK
- Dependencies: MT-1

#### MT-3: Deal Form — Status-Feld
- Goal: Status-Dropdown im Edit-Sheet sichtbar
- Files: `cockpit/src/app/(app)/pipeline/deal-form.tsx`
- Expected behavior: Status wählbar beim Bearbeiten
- Verification: Build OK
- Dependencies: MT-2

#### MT-4: Activity-Logging für alle Deal-Mutationen
- Goal: createDeal, updateDeal, deleteDeal loggen Activities
- Files: `cockpit/src/app/(app)/pipeline/actions.ts`
- Expected behavior: Jede Deal-Mutation erzeugt Activity-Eintrag
- Verification: Build OK
- Dependencies: MT-2
