# SLC-606 — Performance-Cockpit UI

## Slice Info
- Feature: FEAT-603
- Priority: High
- Estimated Effort: 1.5 Tage
- Dependencies: SLC-604 (Prognose-Engine), SLC-605 (KPI-Snapshots)

## Goal

Vollstaendige Performance-Cockpit-Seite (/performance) mit Soll-Ist-Abgleich, Prognose, Produkt-Aufschluesselung und Trend-Vergleich.

## Scope

- Neue Seite: /performance (unter Analyse in Navigation)
- Hero-Bereich: KPI-Cards mit Ring/Balken pro Ziel
- Zeitraum-Toggle: Monat / Quartal / Jahr
- Farbcodierung: Gruen (>= 90%), Gelb (70-89%), Rot (< 70%)
- Prognose-Block: Pipeline-gewichtet + historisch + Delta
- Produkt-Aufschluesselung: Mini-Balken pro Produkt
- Trend-Vergleich: Aktuelle vs. Vorperiode (aus KPI-Snapshots)
- Navigation: Menuepunkt "Meine Performance" unter Analyse
- Link zu Ziel-Verwaltung (/performance/goals)

## Out of Scope

- KI-Empfehlung (SLC-607)
- Mein-Tag-Widget (SLC-607)

## Acceptance Criteria

1. /performance zeigt alle aktiven Ziele mit Soll-Ist-Abgleich
2. Zeitraum-Toggle (Monat/Quartal/Jahr) wechselt die Ansicht
3. KPI-Cards mit Fortschrittsbalken/Ring und Farbcodierung
4. Prognose-Block zeigt Pipeline-gewichtet, historisch, kombiniert, Delta
5. Produkt-Aufschluesselung zeigt pro-Produkt Soll-Ist (wenn Ziele existieren)
6. Trend-Vergleich zeigt Vorperiode (wenn KPI-Snapshots vorhanden)
7. "Nicht genug Daten" bei zu wenig Datenpunkten
8. Navigation "Meine Performance" unter Analyse sichtbar
9. Responsive: Auf Tablet/Desktop gut lesbar
10. `npm run build` gruen

## QA-Fokus

- Berechungskorrektheit: Angezeigte Werte stimmen mit DB-Daten ueberein
- Edge Case: Keine Ziele definiert → leere State mit Hinweis "Noch keine Ziele definiert"
- Edge Case: Keine Deals → IST = 0, Prognose zeigt "Nicht genug Daten"
- Edge Case: Nur Gesamtziele, keine Produkt-Ziele → Produkt-Section ausgeblendet
- Visual: Farbcodierung korrekt (gruen/gelb/rot bei richtigen Schwellen)

### Micro-Tasks

#### MT-1: Performance-Page Layout + Zeitraum-Toggle
- Goal: Grundstruktur der /performance Seite mit Period-Toggle
- Files: `app/(app)/performance/page.tsx`, `components/performance/period-toggle.tsx`
- Expected behavior: Seite laedt, Toggle zwischen Monat/Quartal/Jahr aendert die angezeigten Ziele, URL-Parameter fuer Zeitraum
- Verification: Browser-Test: Seite laedt, Toggle funktioniert
- Dependencies: none

#### MT-2: KPI-Goal-Cards (Hero-Bereich)
- Goal: Ziel-Cards mit Fortschrittsring und Farbcodierung
- Files: `components/performance/goal-card.tsx`, `components/performance/progress-ring.tsx`
- Expected behavior: Pro Ziel: Card mit Typ-Label, Sollwert, Istwert, Fortschritt (%), Ring-Diagramm. Farbe: Gruen >= 90%, Gelb 70-89%, Rot < 70%.
- Verification: Browser-Test: Cards werden angezeigt, Farben korrekt
- Dependencies: MT-1

#### MT-3: Prognose-Block
- Goal: Prognose-Anzeige unter den Goal-Cards
- Files: `components/performance/forecast-block.tsx`
- Expected behavior: Pipeline-gewichtet, historisch, kombiniert, Delta ("Dir fehlen noch X EUR / N Deals"). "Nicht genug Daten" bei zu wenig Datenpunkten.
- Verification: Browser-Test: Prognose-Werte sichtbar
- Dependencies: MT-2

#### MT-4: Produkt-Aufschluesselung
- Goal: Pro-Produkt Soll-Ist Balken
- Files: `components/performance/product-breakdown.tsx`
- Expected behavior: Pro Produkt: Mini-Balken mit Name, Soll, Ist, %. Nur sichtbar wenn produktspezifische Ziele existieren.
- Verification: Browser-Test: Produkt-Balken werden angezeigt
- Dependencies: MT-3

#### MT-5: Trend-Vergleich
- Goal: Vorperioden-Vergleich aus KPI-Snapshots
- Files: `components/performance/trend-comparison.tsx`
- Expected behavior: Aktuelle Periode vs. Vorperiode: Umsatz, Deals, Quote. Pfeil hoch/runter + Prozent-Differenz. "Keine Trend-Daten" wenn Snapshots fehlen.
- Verification: Browser-Test: Trend-Daten werden angezeigt (oder Hinweis wenn leer)
- Dependencies: MT-1

#### MT-6: Navigation + Empty State
- Goal: Menuepunkt unter Analyse, Link zu Ziel-Verwaltung, Empty State
- Files: Sidebar-Komponente (bestehend, erweitern), `components/performance/empty-state.tsx`
- Expected behavior: "Meine Performance" in Sidebar unter Analyse. Wenn keine Ziele: "Noch keine Ziele definiert — Jetzt Ziele anlegen" mit Link zu /performance/goals.
- Verification: Browser-Test: Navigation funktioniert, Empty State sichtbar wenn keine Ziele
- Dependencies: MT-1
