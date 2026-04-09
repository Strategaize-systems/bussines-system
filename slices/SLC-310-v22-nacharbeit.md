# SLC-310 — V2.2 Nacharbeit + Extras

## Slice Info
- Feature: BL-212, BL-213 (V2.2 Bugfixes in V3 Scope)
- Version: V3
- Priority: Medium
- Dependencies: keine (kann jederzeit gemacht werden)
- Type: Frontend

## Goal
V2.2 UI-Redesign Nacharbeit: Pipeline Style Guide Fixes und Multiplikatoren Standort-Filter. Optional: Pipeline Liste-Ansicht.

## Scope

### Included
1. Pipeline-Seiten Style Guide V2 Fix:
   - KPI-Kacheln nach Style Guide V2 angleichen
   - Horizontales Scrollen reparieren
   - Rechte Kachel nicht mehr abgeschnitten
2. Multiplikatoren-Seite: Standort-Filter hinzufuegen (Konsistenz mit Firmen-Seite)

### Stretch (optional, je nach Zeit)
3. Pipeline Liste-Ansicht Toggle (Kanban ↔ Tabelle) — BL-128

### Excluded
- Activity-Queue / Focus View (BL-132) — eigenes Feature, ggf. V3.1
- Unified Timeline Refactoring (BL-130) — bereits in SLC-306 Deal-Timeline abgedeckt
- Funnel-Report (BL-133) — V3.1
- Win/Loss-Analyse Dashboard (BL-134) — V3.1

## Backlog Items
- BL-212: Pipeline-Seiten V2.2 Style Guide Nacharbeit
- BL-213: Multiplikatoren Standort-Filter
- BL-128: Pipeline Liste-Ansicht Toggle (stretch)

## Acceptance Criteria
1. Pipeline KPI-Kacheln sehen nach Style Guide V2 aus
2. Horizontales Scrollen funktioniert korrekt
3. Keine abgeschnittenen Kacheln
4. Multiplikatoren-Seite hat Standort-Filter wie Firmen-Seite
5. (Stretch) Pipeline-Toggle zwischen Kanban und Tabelle

## Micro-Tasks

### MT-1: Pipeline KPI-Kacheln Fix
- Goal: KPI-Kacheln auf Pipeline-Seiten nach Style Guide V2 angleichen
- Files: Pipeline-Seiten-Komponenten
- Expected behavior: Konsistentes Styling, kein visueller Bruch
- Verification: Browser-Check — alle 3 Pipeline-Seiten
- Dependencies: keine

### MT-2: Pipeline Scroll-Fix
- Goal: Horizontales Scrollen reparieren, rechte Kachel nicht abgeschnitten
- Files: Pipeline-Seiten Layout
- Expected behavior: Smooth Scroll, alle Kacheln sichtbar
- Verification: Browser-Check — verschiedene Viewports
- Dependencies: MT-1

### MT-3: Multiplikatoren Standort-Filter
- Goal: Standort-Filter auf Multiplikatoren-Seite (wie Firmen-Seite)
- Files: Multiplikatoren-Seite Komponente
- Expected behavior: Filter-Dropdown mit Standorten, filtert Multiplikator-Liste
- Verification: Browser-Check — Filter funktional
- Dependencies: keine

## Technical Notes
- Standort-Filter: Wiederverwendung der Logik von Firmen-Seite (dort existiert bereits ein Filter)
- Pipeline Style Fix: Reine CSS/Layout-Aenderungen, keine Logik-Aenderungen
- Dieser Slice ist bewusst als "Nacharbeit" positioniert und kann flexibel eingeschoben werden
