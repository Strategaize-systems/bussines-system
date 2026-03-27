# SLC-006 — Dashboard

## Meta
- Feature: FEAT-003
- Priority: High
- Status: planned
- Dependencies: SLC-003, SLC-004, SLC-005

## Goal
Business Cockpit Dashboard als Einstiegsseite nach Login. Pipeline-Zusammenfassung, letzte Aktivitäten, offene Follow-ups, Quick-Links.

## Scope
- Pipeline-Summary-Cards (Deals pro Stage, getrennt nach Pipeline)
- Letzte Aktivitäten (alle Kontakte, chronologisch, letzte 20)
- Offene Follow-ups / Nächste Aktionen (Deals mit next_action_date)
- Quick-Links zu allen Hauptbereichen
- Stats: Gesamtzahl Kontakte, Firmen, offene Deals, Dealwert in Pipeline

## Out of Scope
- Redaktionskalender (SLC-007)
- Charts / Performance-Analyse (V4)

### Micro-Tasks

#### MT-1: Dashboard-Datenaggregation
- Goal: Server Actions die Dashboard-Daten aggregieren
- Files: `cockpit/app/(app)/dashboard/actions.ts`
- Expected behavior: getDashboardStats (Counts, Pipeline-Werte), getRecentActivities(limit), getUpcomingActions(limit)
- Verification: Daten werden korrekt aggregiert
- Dependencies: SLC-003, SLC-004, SLC-005

#### MT-2: Pipeline-Summary-Cards
- Goal: Kompakte Karten die Pipeline-Status pro Pipeline zeigen
- Files: `cockpit/app/(app)/dashboard/pipeline-summary.tsx`
- Expected behavior: Pro Pipeline: Mini-Balken mit Deals pro Stage, Gesamt-Dealwert
- Verification: Karten zeigen korrekte Zahlen
- Dependencies: MT-1

#### MT-3: Aktivitäten-Feed + Follow-ups
- Goal: Zwei Listen: letzte Aktivitäten und offene nächste Aktionen
- Files: `cockpit/app/(app)/dashboard/recent-activities.tsx`, `cockpit/app/(app)/dashboard/upcoming-actions.tsx`
- Expected behavior: Aktivitäten chronologisch, Follow-ups nach Datum sortiert mit Farbmarkierung (überfällig = rot)
- Verification: Listen zeigen korrekte Daten
- Dependencies: MT-1

#### MT-4: Dashboard-Seite zusammenbauen
- Goal: Dashboard-Page mit allen Widgets + Stats + Quick-Links
- Files: `cockpit/app/(app)/dashboard/page.tsx`
- Expected behavior: Responsives Grid: Stats oben, Pipeline-Summary, dann Aktivitäten/Follow-ups nebeneinander
- Verification: Dashboard lädt, alle Widgets sichtbar, Quick-Links navigieren
- Dependencies: MT-2, MT-3
