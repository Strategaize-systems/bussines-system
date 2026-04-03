# SLC-203 — Deal-Rotting + Required Fields per Stage

## Meta
- Feature: BL-124, BL-125
- Priority: High
- Status: planned
- Dependencies: SLC-201

## Goal
Stagnation sichtbar machen (Deal-Rotting) und Datenqualität sichern (Required Fields bei Stage-Wechsel).

## Scope
- Deal-Rotting: Cards farbig markieren wenn >7d (gelb) oder >14d (rot) in Stage
- Rotting basierend auf updated_at vs. jetzt
- Required Fields: Validierung bei Drag-and-Drop (z.B. Wert muss gesetzt sein ab "Angebot vorbereitet")
- Konfiguration: pro Pipeline-Stage festlegbar welche Felder Pflicht sind

## Out of Scope
- Stage-spezifische Konfiguration UI (erstmal hardcoded Mapping)

### Micro-Tasks

#### MT-1: Deal-Rotting auf Kanban-Cards
- Goal: Cards die >7d/14d in Stage sind farbig markieren
- Files: `cockpit/src/components/kanban/kanban-card.tsx`
- Expected behavior: Gelber Rand >7d, Roter Rand >14d, "Stagniert X Tage" Badge
- Verification: Build OK
- Dependencies: none

#### MT-2: Required Fields Validierung bei Stage-Wechsel
- Goal: moveDealToStage prüft ob Pflichtfelder gesetzt sind
- Files: `cockpit/src/app/(app)/pipeline/actions.ts`, `cockpit/src/components/kanban/kanban-board.tsx`
- Expected behavior: Drag zu "Angebot vorbereitet" ohne Wert → Fehlermeldung
- Verification: Build OK
- Dependencies: none
