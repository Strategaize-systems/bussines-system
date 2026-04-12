# SLC-408 — Gesamtkalender UI

## Slice Info
- Feature: FEAT-406
- Priority: High
- Delivery Mode: internal-tool

## Goal
Gesamtkalender-Ansicht (Tages-/Wochen-/Monatsansicht) im Business System. Alle Kalender-Quellen vereint. Navigation ueber Sidebar. Mein Tag Kalender-Panel auf Cal.com-Daten umstellen.

## Scope
- /kalender Route (neue Seite)
- Tages-/Wochen-/Monatsansicht (Google-Calendar-aehnlich)
- Datenquellen: calendar_events (manual + calcom), meetings
- Farbcodierung nach Typ
- Event-Detail mit Deal-/Kontakt-Kontext
- Sidebar-Navigation: "Kalender" unter Operativ
- Mein Tag Kalender-Panel auf gleiche Datenquelle umstellen

## Out of Scope
- Drag-and-Drop Terminverschiebung (spaetere Erweiterung)
- Recurring Events Management (Cal.com handled das)

### Micro-Tasks

#### MT-1: Kalender-Seite + Routing
- Goal: /kalender Route mit Tages-/Wochen-/Monatsansicht Tabs
- Files: `cockpit/src/app/(app)/kalender/page.tsx`, `cockpit/src/app/(app)/kalender/calendar-view.tsx`
- Expected behavior: Kalender-Seite mit 3 Ansichten, Daten aus calendar_events + meetings
- Verification: Browser-Check
- Dependencies: none

#### MT-2: Kalender-Komponenten (Tages/Wochen/Monat)
- Goal: Kalender-Grid-Komponenten fuer alle 3 Ansichten
- Files: `cockpit/src/app/(app)/kalender/day-view.tsx`, `cockpit/src/app/(app)/kalender/week-view.tsx`, `cockpit/src/app/(app)/kalender/month-view.tsx`
- Expected behavior: Zeitraster, Events als Bloecke/Karten, Farbcodierung nach Typ
- Verification: Browser-Check mit Testdaten
- Dependencies: MT-1

#### MT-3: Sidebar-Navigation erweitern
- Goal: "Kalender" in Sidebar unter Operativ hinzufuegen
- Files: `cockpit/src/components/sidebar.tsx` (erweitert)
- Expected behavior: Kalender-Link in Sidebar, aktiver State
- Verification: Browser-Check
- Dependencies: MT-1

#### MT-4: Mein Tag Kalender-Panel umstellen
- Goal: Mein Tag Kalender zeigt alle Quellen (manual + calcom)
- Files: `cockpit/src/app/(app)/mein-tag/actions.ts` (erweitert), `cockpit/src/app/(app)/mein-tag/mein-tag-client.tsx` (erweitert)
- Expected behavior: Kalender-Panel zeigt Cal.com-Events neben manuellen Events
- Verification: Browser-Check auf Mein Tag
- Dependencies: MT-1

## Acceptance Criteria
1. /kalender Seite existiert mit 3 Ansichten
2. Alle Kalender-Quellen sind vereint dargestellt
3. Farbcodierung nach Event-Typ
4. Event-Detail zeigt Deal-/Kontakt-Kontext
5. Sidebar-Navigation enthaelt Kalender-Link
6. Mein Tag Kalender nutzt gleiche Datenquelle
