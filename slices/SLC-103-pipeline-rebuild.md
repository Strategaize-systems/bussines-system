# SLC-103 — Pipeline Rebuild (BD-spezifische Kanban-Boards)

## Meta
- Feature: FEAT-104
- Priority: Blocker
- Status: planned
- Dependencies: SLC-101

## Goal
Zwei separate Kanban-Boards mit geschaeftsspezifischen Stufen (10 Multiplikatoren, 12 Unternehmer). Neue Seed-Daten. Opportunity-Typen auf Deals.

## Scope
- Delete alte Seeds (Content-Marketing-Pipelines)
- Insert neue Seeds: Multiplikatoren-Pipeline (10 Stufen), Unternehmer-Pipeline (12 Stufen)
- Pipeline-Seiten anpassen (neue Slugs fuer beide Pipelines)
- Deal-Form: opportunity_type Feld hinzufuegen
- Won/Lost-Reason Feld bei Status "Verloren"

## Out of Scope
- Multiplikator-eigene Ansicht (SLC-104)
