# SLC-610 — Tages-Check UI auf Performance-Cockpit

## Slice Info
- Feature: FEAT-603
- Priority: High
- Estimated Effort: 1 Tag
- Dependencies: SLC-609 (Activity-KPI-Targets)

## Goal

Tages-Check-Ansicht auf /performance die zeigt: was habe ich heute/diese Woche gemacht vs. was sollte ich machen. Wie beim Kalorienzaehlen — jeden Tag sehen ob man im Soll liegt.

## Scope

- Neue Section auf /performance: "Tages-Check" mit Aktivitaets-KPIs
- Pro KPI: Balken mit Soll/Ist und Farbcodierung
- Wochen-Aggregation: "Diese Woche: 15/25 Telefonate, 6/10 Meetings"
- Vergleich vs. letzte Woche: Pfeil hoch/runter
- Wenn keine Targets definiert: Hinweis "Tages-KPIs definieren" mit Link
- Responsive, konsistent mit bestehendem Performance-Cockpit Design

## Out of Scope

- Monats-/Quartals-Aggregation der Activity-KPIs (spaeter)
- Benachrichtigungen bei Unterschreitung
- Gamification (Streaks, Badges)

## Acceptance Criteria

1. "Tages-Check" Section auf /performance sichtbar
2. Pro definiertem Activity-KPI: Balken mit Ist/Soll + Farbcodierung
3. Wochen-Aggregation sichtbar
4. Vergleich vs. Vorwoche (Pfeil + Prozent)
5. Ohne definierte Targets: leerer Zustand mit Link zu Einstellungen
6. Stagnante Deals werden als Warnung angezeigt
7. npm run build gruen
