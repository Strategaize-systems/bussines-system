# SLC-612 — ForecastCard + 4-Kachel-Layout

## Slice Info
- Feature: FEAT-611
- Priority: High
- Estimated Effort: 2-3 Stunden
- Dependencies: SLC-611 (Premium-Styling muss bereits angewendet sein)

## Goal

ForecastBlock von Full-Width-Block zu kompakter ForecastCard umbauen. Goal-Cards-Grid auf 4 Spalten aendern, sodass GoalCards + ForecastCard in einer Reihe stehen. WeeklyComparison-Komponente entfernen (wird in SLC-613 in DailyActivityCheck integriert).

## Scope

- ForecastBlock → ForecastCard (kompakt: kombinierter Forecast + Delta + Deals-noetig)
- Grid von lg:grid-cols-3 auf lg:grid-cols-4
- WeeklyComparison entfernen aus page.tsx
- weekly-comparison.tsx Datei behalten (wird erst in SLC-613 obsolet)
- Page-Layout anpassen

## Out of Scope

- GoalCard-Styling (SLC-611)
- Wochen-Check (SLC-613)
- KI-Empfehlung-Umbau

## Acceptance Criteria

1. ForecastCard ist kompakt und steht als 4. Kachel neben den Goal-Cards
2. Grid ist lg:grid-cols-4, sm:grid-cols-2, grid-cols-1
3. ForecastCard zeigt: kombinierten Forecast-Wert, Delta (fehlen/ueber Ziel), Deals-noetig
4. ForecastCard hat Premium-Styling (Gradient-Akzentlinie, Shadows)
5. WeeklyComparison ist nicht mehr auf der Seite sichtbar
6. Wenn keine Prognose-Daten: ForecastCard zeigt "Nicht genug Daten"
7. npm run build gruen

## Micro-Tasks

### MT-1: ForecastCard-Komponente
- Goal: ForecastBlock umbauen zu kompakter ForecastCard die als Kachel passt
- Files: `cockpit/src/components/performance/forecast-block.tsx`
- Expected behavior: Kompakte Karte mit: Gradient-Akzentlinie, Icon-Container (TrendingUp), kombinierter Forecast-Wert (formatiert), Delta-Badge (gruen/rot), "Noch X Deals" wenn relevant. Keine 3-Spalten-Unterstruktur mehr. Premium-Styling wie GoalCard (border-2, shadow-lg, hover).
- Verification: npm run build gruen
- Dependencies: none

### MT-2: Page-Layout 4-Kachel-Grid
- Goal: Performance-Page Grid anpassen und WeeklyComparison entfernen
- Files: `cockpit/src/app/(app)/performance/page.tsx`
- Expected behavior: Goal-Cards + ForecastCard in einer 4-spaltigen Reihe (lg:grid-cols-4). ForecastCard wird nach den Goal-Cards gerendert, im selben Grid. WeeklyComparison-Import und -Rendering entfernt. Reihenfolge: Header → KPI-Grid (4 Kacheln) → KI-Empfehlung → Tages-Check → Product Breakdown → Trend Comparison.
- Verification: npm run build gruen, visuell 4 Kacheln nebeneinander
- Dependencies: MT-1

## QA-Fokus

- 4 Kacheln visuell nebeneinander auf Desktop
- ForecastCard zeigt korrekte Werte (kombinierter Forecast, Delta)
- Responsive: 2 Spalten auf Tablet, 1 Spalte auf Mobile
- "Nicht genug Daten" State funktioniert
- WeeklyComparison ist weg
