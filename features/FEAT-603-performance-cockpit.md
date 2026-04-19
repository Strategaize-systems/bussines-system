# FEAT-603 — Persoenliches Performance-Cockpit

## Purpose

Eigene Seite "Meine Performance" mit Soll-Ist-Abgleich, Fortschrittsanzeige und Prognose. Der Uebergang von Reporting zu Performance Management.

## Scope

### Bereiche

1. **Ziel-Uebersicht (Hero-Bereich)**
   - Zeitraum-Toggle: Monat / Quartal / Jahr
   - Pro Ziel: Sollwert, Istwert, Fortschritt (%), Prognose
   - Fortschrittsbalken oder Ring-Diagramm
   - Farbcodierung: Gruen (>= 90% auf Kurs), Gelb (70-89%), Rot (<70%)

2. **Prognose-Block**
   - Pipeline-gewichtete Prognose: offene Deals × Stage-Wahrscheinlichkeit
   - Historische Prognose: bisheriges Tempo hochgerechnet bis Periodenende
   - Kombinierte Prognose: realistisch erreichbarer Wert
   - Delta: "Dir fehlen noch N EUR / M Deals"

3. **KI-Handlungsempfehlung**
   - Bedrock analysiert Ziel-Status + Pipeline-Daten
   - Konkrete Empfehlung (z.B. "Du brauchst noch 3 Abschluesse bei 25% Quote → 12 aktive Deals noetig, du hast 8 → 4 weitere generieren")
   - On-click (nicht auto-load — DEC-028 Kostenregel)

4. **Produkt-Aufschluesselung**
   - Pro Produkt: Soll vs. Ist (wenn produktspezifische Ziele existieren)
   - Mini-Balken pro Produkt

5. **Trend-Vergleich**
   - Aktueller Zeitraum vs. Vorperiode
   - Basiert auf KPI-Snapshots (FEAT-604)

### Navigation
- Eigener Menuepunkt unter "Analyse" (neben Dashboard)
- Optional: Kurzversion als Widget auf "Mein Tag"

## Dependencies

- FEAT-602 (Ziel-Objekt-Modell) — Soll-Daten
- FEAT-604 (KPI-Snapshots) — Trend-Daten
- FEAT-601 (Produkt-Stammdaten) — Produkt-Aufschluesselung
- Bestehender Pipeline-Forecast (Stage-Wahrscheinlichkeiten)
- Bestehende Bedrock-Integration (KI-Empfehlung)

## Out of Scope

- Team-Ansicht / Vergleich zwischen Mitarbeitern (V7)
- Coaching-Modus
- Automatische Benachrichtigungen bei Ziel-Gefaehrdung
- Gamification

## Acceptance Criteria

1. Performance-Cockpit zeigt alle aktiven Ziele mit Soll-Ist-Abgleich
2. Zeitraum-Toggle (Monat/Quartal/Jahr) funktioniert
3. Farbcodierung reflektiert korrekten Zielerreichungsgrad
4. Pipeline-gewichtete Prognose nutzt bestehende Stage-Wahrscheinlichkeiten
5. Historische Prognose basiert auf bisherigem Tempo im aktuellen Zeitraum
6. KI-Handlungsempfehlung ist on-click abrufbar
7. Produkt-Aufschluesselung zeigt korrekte Werte pro Produkt
8. Trend-Vergleich zeigt Vorperiode wenn KPI-Snapshots vorhanden
