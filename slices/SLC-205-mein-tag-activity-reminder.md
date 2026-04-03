# SLC-205 — "Mein Tag" + Activity-Reminder

## Meta
- Feature: BL-143, BL-126
- Priority: Blocker
- Status: planned
- Dependencies: none

## Goal
Tagesplanungs-Übersicht "Mein Tag" als neue Seite. Activity-Reminder prominent auf Dashboard.

## Scope
- Neue Route /mein-tag mit Sidebar-Eintrag
- Zusammengeführte Tagesansicht: fällige Aufgaben, Deal-Aktionen, überfällige Items
- Server Action: getTodayItems() — aggregiert aus tasks, deals, activities
- Activity-Reminder-Banner auf Dashboard: "X überfällige Aktionen"
- Link zum betroffenen Deal/Aufgabe

## Out of Scope
- Zeitblöcke/Verfügbarkeit (späteres Enhancement)
- Kalender-Sync (V4)

### Micro-Tasks

#### MT-1: getTodayItems Server Action
- Goal: Alle für heute relevanten Items aggregieren
- Files: `cockpit/src/app/(app)/mein-tag/actions.ts`
- Expected behavior: Returns fällige Aufgaben + Deal-Aktionen + überfällige Items
- Verification: Build OK
- Dependencies: none

#### MT-2: "Mein Tag" Seite
- Goal: Übersichtsseite mit gruppierten Tages-Items
- Files: `cockpit/src/app/(app)/mein-tag/page.tsx`, `cockpit/src/app/(app)/mein-tag/mein-tag-client.tsx`
- Expected behavior: Gruppiert nach Typ, überfällige rot, Links zu Deals/Aufgaben
- Verification: Build OK
- Dependencies: MT-1

#### MT-3: Sidebar-Eintrag + Dashboard Activity-Reminder
- Goal: "Mein Tag" in Sidebar, Reminder-Banner auf Dashboard
- Files: `cockpit/src/components/layout/sidebar.tsx`, `cockpit/src/app/(app)/dashboard/page.tsx`, `cockpit/src/app/(app)/dashboard/actions.ts`
- Expected behavior: Sidebar-Link, Dashboard zeigt "X überfällige Aktionen" mit Link
- Verification: Build OK
- Dependencies: MT-2
