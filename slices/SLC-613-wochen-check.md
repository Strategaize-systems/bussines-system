# SLC-613 — Wochen-Check mit Tagesaufloesung

## Slice Info
- Feature: FEAT-611
- Priority: High
- Estimated Effort: 3 Stunden
- Dependencies: SLC-611 (Premium-Styling), SLC-612 (WeeklyComparison entfernt)

## Goal

DailyActivityCheck um Heute/Woche-Toggle erweitern. In der Wochenansicht wird pro KPI ein 5-Spalten-Raster (Mo-Fr) mit Ist/Soll pro Tag angezeigt. User sieht auf einen Blick, wie jeder einzelne Tag der Woche gelaufen ist.

## Scope

- Neuer Typ WeekDayKpiStatus in types/activity-kpis.ts
- Hilfsfunktion dayRangesForWeek() in activity-kpi-queries.ts
- Neue Server Action getWeeklyActivityKpisPerDay() in activity-kpis.ts
- DailyActivityCheck: Heute/Woche Toggle (Client-Component-Teil)
- Wochen-Raster: 5 Spalten (Mo-Fr), pro KPI eine Zeile, Farbcodierung pro Zelle
- weekly-comparison.tsx kann geloescht werden (bereits aus Page entfernt in SLC-612)

## Out of Scope

- Monats-/Quartalsansicht
- Wochenend-Tage (Sa/So)
- Historische Wochen (nur aktuelle Woche)

## Acceptance Criteria

1. Heute/Woche Toggle sichtbar im Tages-Check
2. Bei "Woche": 5-Spalten-Raster (Mo-Fr) pro KPI
3. Pro Zelle: Ist-Wert mit Farbcodierung (gruen >= 90%, gelb >= 50%, rot < 50%)
4. Target-Wert pro Zelle erkennbar (z.B. als kleine Zahl oder im Tooltip)
5. Heutiger Tag visuell hervorgehoben
6. Stagnante Deals mit invertierter Farblogik (mehr = schlimmer)
7. Ohne Targets: Leerer Zustand bleibt
8. npm run build gruen

## Micro-Tasks

### MT-1: Typ + Query-Helfer
- Goal: WeekDayKpiStatus Typ definieren und dayRangesForWeek() Helfer implementieren
- Files: `cockpit/src/types/activity-kpis.ts`, `cockpit/src/lib/goals/activity-kpi-queries.ts`
- Expected behavior: dayRangesForWeek() gibt Array von 5 {start, end, dayLabel, date, isToday} zurueck (Mo-Fr der aktuellen Woche). Nutzt korrekte Date-Arithmetik (kein String-basiert, IMP-096 beachten).
- Verification: npm run build gruen
- Dependencies: none

### MT-2: Server Action getWeeklyActivityKpisPerDay()
- Goal: Pro KPI pro Wochentag die Ist-Werte abfragen
- Files: `cockpit/src/app/actions/activity-kpis.ts`
- Expected behavior: Nutzt bestehende getActivityKpiActual() mit dayRangesForWeek(). Pro aktiven KPI-Target: 5 Tagesabfragen parallel (Promise.all). Gibt WeekDayKpiStatus[] zurueck.
- Verification: npm run build gruen
- Dependencies: MT-1

### MT-3: DailyActivityCheck Heute/Woche Toggle + Wochen-Raster
- Goal: Komponente erweitern um Toggle und Wochen-Raster-Ansicht
- Files: `cockpit/src/components/performance/daily-activity-check.tsx`, `cockpit/src/app/(app)/performance/page.tsx`
- Expected behavior: Toggle "Heute | Woche" oben im Tages-Check. Bei "Heute": bestehende Ansicht unveraendert. Bei "Woche": 5-Spalten-Raster mit Tagesaufloesung. Farbcodierung pro Zelle. Heutiger Tag hervorgehoben (z.B. border-2 oder bg-slate-50). Page laedt weeklyPerDay-Daten und reicht sie als Prop weiter. Komponente wird teilweise Client-Component (fuer Toggle-State).
- Verification: npm run build gruen, visuell im Browser
- Dependencies: MT-2

### MT-4: Cleanup weekly-comparison.tsx
- Goal: Die nicht mehr verwendete WeeklyComparison-Datei loeschen
- Files: `cockpit/src/components/performance/weekly-comparison.tsx` (DELETE)
- Expected behavior: Datei existiert nicht mehr. Keine Imports mehr vorhanden (bereits in SLC-612 entfernt).
- Verification: npm run build gruen, keine toten Imports
- Dependencies: MT-3

## QA-Fokus

- Toggle wechselt zwischen Heute und Woche
- Wochen-Raster zeigt korrekte Wochentage (Mo-Fr)
- Farbcodierung konsistent mit Tages-Ansicht
- Stagnante Deals: invertierte Farblogik auch im Wochen-Raster
- Heutiger Tag visuell hervorgehoben
- Leerer Zustand (keine Targets) funktioniert weiterhin
- Date-Arithmetik korrekt am Monatsende (IMP-096 Pattern)
