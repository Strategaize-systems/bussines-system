# SLC-311 — Meeting/Kalender UX-Fixes

## Slice Info
- Feature: FEAT-308, FEAT-309
- Version: V3.1
- Priority: Blocker
- Dependencies: keine
- Type: Frontend

## Goal
Zeit-Picker und Meeting-Typ-Auswahl fixen. Beides sind taegliche UX-Schmerzpunkte bei der Meeting-/Termin-Erstellung.

## Scope

### Included
1. Zeit-Picker: Schnellauswahl mit gaengigen Zeiten (15/30/45/60-Min-Raster), klickbar statt Scroll-Raedchen
2. Fuer Sonderzeiten: editierbares Feld per Icon-Klick
3. Meeting-Typ: Dropdown Online vs. Physisch
4. Online = Default, Location automatisch "Home Office"
5. Physisch = Adress-Eingabe wird Pflicht

### Excluded
- Cal.com-Sync (V4)
- Kalender-Wochenansicht
- Wiederkehrende Termine

## Backlog Items
- BL-317: Zeit-Picker Schnellauswahl
- BL-318: Meeting-Typ Online vs. Physisch

## Acceptance Criteria
1. Zeit-Picker zeigt klickbare Zeitvorschlaege im 15-Min-Raster (08:00 bis 20:00)
2. Custom-Zeit per Icon-Klick editierbar
3. Meeting-Formular hat Typ-Dropdown (Online/Physisch)
4. Online setzt Location automatisch auf "Home Office"
5. Physisch oeffnet Adress-Feld als Pflicht
6. Bestehende Meetings bleiben funktional (kein Breaking Change)

## Micro-Tasks

### MT-1: Zeit-Picker Komponente
- Goal: Neuen TimePicker mit Schnellauswahl bauen
- Files: `components/ui/time-picker.tsx` (neu oder bestehend ersetzen)
- Expected behavior: Klickbare Zeitslots im 15-Min-Raster, Custom-Input per Toggle
- Verification: Storybook/Browser-Check — Zeiten klickbar, Custom-Input funktioniert
- Dependencies: keine

### MT-2: Meeting-Typ + Location-Logik
- Goal: Typ-Auswahl (Online/Physisch) in Meeting-Formular einbauen
- Files: Meeting-Erstellungs-Formular (bestehend), ggf. Meeting-Schema erweitern
- Expected behavior: Online = Default + "Home Office". Physisch = Adressfeld wird Pflicht.
- Verification: Browser-Check — Meeting erstellen mit Online + Physisch
- Dependencies: keine

### MT-3: Integration in Kalender-Event-Formular
- Goal: Neuen TimePicker + Meeting-Typ auch im Kalender-Event-Formular nutzen
- Files: Calendar-Event-Erstellungs-Formular (bestehend)
- Expected behavior: Gleiche UX wie Meeting-Formular
- Verification: Browser-Check — Kalender-Event mit neuem Picker erstellen
- Dependencies: MT-1

## Technical Notes
- meetings Tabelle hat bereits `location` (Text). Kein Schema-Change noetig.
- Meeting-Typ kann als UI-only-Logik implementiert werden (kein neues DB-Feld noetig, oder optional `type` Feld in meetings falls sinnvoll)
- Bestehende Meetings mit Freitext-Location bleiben gueltig
