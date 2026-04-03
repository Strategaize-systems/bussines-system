# SLC-204 — Pipeline-Filter + Probability-Forecast

## Meta
- Feature: BL-119, BL-121, BL-122
- Priority: High
- Status: planned
- Dependencies: SLC-201

## Goal
Pipeline filterbar machen und gewichtete Umsatzprognose anzeigen. Referral-Source auf Deals verknüpfbar.

## Scope
- Filter-Leiste über Kanban: Status (active/won/lost), Opportunity-Typ
- Gewichteter Forecast: Stage-Probability × Deal-Wert im Pipeline-Header
- Referral-Source Dropdown im Deal-Form
- Dashboard: Forecast-Card

## Out of Scope
- Liste-Ansicht Toggle (V2.2 BL-128)
- Wert-Range Filter (V2.2)

### Micro-Tasks

#### MT-1: Pipeline-Filter UI + Logik
- Goal: Filter-Dropdowns über dem Kanban, client-seitig filtern
- Files: `cockpit/src/app/(app)/pipeline/pipeline-view.tsx`
- Expected behavior: Filter reduziert sichtbare Deals
- Verification: Build OK
- Dependencies: none

#### MT-2: Probability-Forecast Berechnung + Anzeige
- Goal: Gewichteter Forecast im Pipeline-Header und Dashboard
- Files: `cockpit/src/app/(app)/pipeline/pipeline-view.tsx`, `cockpit/src/app/(app)/dashboard/actions.ts`, `cockpit/src/app/(app)/dashboard/page.tsx`
- Expected behavior: "Forecast: €X" basierend auf Stage-Probability × Wert
- Verification: Build OK
- Dependencies: none

#### MT-3: Referral-Source auf Deal-Form
- Goal: Dropdown um Deal mit Referral zu verknüpfen
- Files: `cockpit/src/app/(app)/pipeline/deal-form.tsx`, `cockpit/src/app/(app)/pipeline/actions.ts`
- Expected behavior: Referral-Source wählbar, wird gespeichert
- Verification: Build OK
- Dependencies: none
