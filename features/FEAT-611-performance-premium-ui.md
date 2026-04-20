# FEAT-611 — Performance-Cockpit Premium UI

## Summary

UI-Update auf /performance: Premium Look nach Style Guide V2, kompakteres 4-Kachel-Layout (Goal-Cards + Prognose), Label-Korrektur "Abschlussquote", Wochen-Check mit Tagesaufloesung.

## Problem

Die aktuelle /performance-Seite ist funktional komplett (V6), aber visuell noch nicht auf dem Niveau der restlichen App (Dashboard, Pipeline). Die Karten sind zu gross, die Prognose ist als separater Block statt als kompakte Kachel dargestellt, das Label "Win-Rate" ist nicht deutsch, und der Tages-Check zeigt nur Summen statt einer Tagesaufloesung innerhalb der Woche.

## Goal

/performance soll visuell auf Premium-Niveau stehen (konsistent mit Dashboard) und die taeglich-wochentliche Aktivitaetskontrolle detaillierter darstellen.

## Scope

### 1. Premium Look (Style Guide V2)
- Brand-Gradients auf Icon-Containern und Akzentlinien (KPICard-Pattern)
- Konsistente Shadows (shadow-sm → hover:shadow-xl mit -translate-y-0.5)
- Border-2 + rounded-2xl auf allen Karten
- Gradient-Akzentlinie oben auf Goal-Cards (wie KPICard)
- Header mit Icon-Container (rounded-xl bg-gradient)
- Typography-Anpassung (page-title, stat-Werte nach Style Guide)

### 2. 4-Kachel-Layout: Goal-Cards + Prognose
- Goal-Cards kompakter (kleinere Werte, kompakterer Padding)
- Prognose als 4. Kachel in derselben Reihe (nicht als separater Full-Width-Block)
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Prognose-Kachel zeigt: kombinierter Forecast-Wert, Delta-Indikator, "Noch X Deals noetig"
- Wenn weniger als 4 Karten: Grid passt sich an

### 3. Label-Korrektur
- "Win-Rate" → "Abschlussquote" ueberall auf /performance und /performance/goals
- Betrifft: goal-card.tsx, forecast-block.tsx, goal-form.tsx, csv-import-dialog.tsx, goal-list.tsx

### 4. Wochen-Check (Tagesaufloesung)
- Neuer Tab/Toggle im Tages-Check: "Heute" | "Woche"
- Wochen-Ansicht: 5-Spalten-Raster (Mo-Fr) mit Ist/Soll pro Tag pro KPI
- Farbcodierung pro Zelle (gruen/gelb/rot)
- Kompakte Darstellung (Mini-Balken oder Zahlen mit Hintergrundfarbe)
- Daten aus bestehenden activity-kpi-queries (pro Tag der Woche abfragen)

## Out of Scope

- Neue Backend-Logik oder Migrationen
- Monats-/Quartals-Aggregation der Activity-KPIs
- Responsive Optimierung fuer Mobile (Desktop-only internal-tool)
- Aenderungen an anderen Seiten (Dashboard, Pipeline etc.)
- KI-Empfehlung UI-Redesign (bleibt wie aktuell)

## Acceptance Criteria

1. /performance nutzt Premium-Karten mit Gradient-Akzentlinie und Brand-Shadows
2. Goal-Cards + Prognose in einer 4-spaltigen Reihe
3. Prognose als kompakte Kachel (nicht als Full-Width-Block)
4. "Win-Rate" heisst ueberall "Abschlussquote"
5. Wochen-Check zeigt Tagesaufloesung (Mo-Fr) mit Ist/Soll pro Tag
6. Farbcodierung im Wochen-Check konsistent mit Tages-Check
7. npm run build gruen

## Technical Notes

- Kein neues Backend — nur neue Server Action `getDailyActivityKpisPerDay()` die pro Wochentag einzeln abfragt (Erweiterung der bestehenden activity-kpi-queries)
- KPICard-Muster aus `/components/ui/kpi-card.tsx` als Referenz fuer Premium-Styling
- Brand-Farben aus CSS-Custom-Properties (`--brand-primary-dark`, `--brand-primary`, etc.)
