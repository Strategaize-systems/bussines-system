# SLC-004 — Pipeline + Kanban

## Meta
- Feature: FEAT-002
- Priority: Blocker
- Status: planned
- Dependencies: SLC-002, SLC-003

## Goal
Zwei Kanban-Pipelines (Endkunden + Multiplikatoren) mit Drag & Drop. Deal-CRUD. Pipeline-Stage-Konfiguration. Deal-Karten zeigen Kontakt, Firma, Status, nächste Aktion.

## Scope
- Deal-CRUD (Server Actions)
- Kanban-Board mit dnd-kit (Drag & Drop zwischen Stages)
- Zwei Pipeline-Views (/pipeline/endkunden, /pipeline/multiplikatoren)
- Deal-Karten: Kontakt, Firma, Wert, letzte Aktivität, nächste Aktion
- Pipeline-Stages konfigurieren (Settings-Seite)
- Stage-Wechsel wird als Aktivität protokolliert

## Out of Scope
- Pipeline-Performance-Analyse (V4)
- Automatische Nächste-Aktion-Vorschläge (V4)

### Micro-Tasks

#### MT-1: Server Actions für Deals
- Goal: CRUD für deals-Tabelle + Stage-Wechsel-Logik
- Files: `cockpit/app/(app)/pipeline/actions.ts`
- Expected behavior: createDeal, getDeals(pipelineId), updateDeal, moveDealToStage (mit Aktivitäts-Log), deleteDeal
- Verification: Deals erstellen und Stage wechseln, Aktivität wird angelegt
- Dependencies: SLC-002, SLC-003/MT-1

#### MT-2: Kanban-Board-Komponente
- Goal: Generische Kanban-Board-Komponente mit dnd-kit
- Files: `cockpit/components/kanban/kanban-board.tsx`, `cockpit/components/kanban/kanban-column.tsx`, `cockpit/components/kanban/kanban-card.tsx`
- Expected behavior: Spalten = Stages, Karten = Deals, Drag & Drop bewegt Deals zwischen Stages
- Verification: Drag & Drop funktioniert, Stage-Wechsel wird gespeichert
- Dependencies: MT-1

#### MT-3: Pipeline-Views (Endkunden + Multiplikatoren)
- Goal: Zwei separate Seiten die das Kanban-Board mit der richtigen Pipeline laden
- Files: `cockpit/app/(app)/pipeline/endkunden/page.tsx`, `cockpit/app/(app)/pipeline/multiplikatoren/page.tsx`
- Expected behavior: Jede Seite zeigt nur Deals der zugehörigen Pipeline
- Verification: Endkunden-Pipeline zeigt nur Endkunden-Deals
- Dependencies: MT-2

#### MT-4: Deal-Erstellen + Bearbeiten
- Goal: Sheet/Modal für neuen Deal (Kontakt auswählen, Firma, Wert, Stage)
- Files: `cockpit/app/(app)/pipeline/deal-form.tsx`, `cockpit/app/(app)/pipeline/deal-sheet.tsx`
- Expected behavior: Formular mit Kontakt-Auswahl (Combobox), Firma auto-fill, Stage-Auswahl
- Verification: Deal erstellen → erscheint als Karte im Kanban
- Dependencies: MT-1, SLC-003/MT-1

#### MT-5: Pipeline-Stage-Konfiguration
- Goal: Settings-Seite zum Verwalten von Pipeline-Stages (Name, Farbe, Reihenfolge)
- Files: `cockpit/app/(app)/settings/page.tsx`, `cockpit/app/(app)/settings/stages-config.tsx`, `cockpit/app/(app)/settings/actions.ts`
- Expected behavior: Stages hinzufügen, umbenennen, Reihenfolge ändern, Farbe setzen
- Verification: Neue Stage erscheint als Spalte im Kanban
- Dependencies: MT-1
