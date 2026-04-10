# SLC-312 — Schnellaktionen-Rebuild

## Slice Info
- Feature: FEAT-302
- Version: V3.1
- Priority: High
- Dependencies: SLC-311 (fuer Meeting-Erstellung)
- Type: Frontend

## Goal
Schnellaktionen in Mein Tag reparieren: Alle Aktionen muessen direkt ein Erstellungs-Sheet oeffnen statt auf Listenseiten zu navigieren. "Neuer Termin" fehlt komplett und muss ergaenzt werden.

## Scope

### Included
1. "Neuer Termin" als Schnellaktion hinzufuegen
2. "Neue E-Mail" oeffnet EmailSheet direkt (nicht /emails)
3. Alle anderen Schnellaktionen pruefen und ggf. fixen
4. Jede Schnellaktion oeffnet das jeweilige Erstellungs-Sheet/Modal

### Excluded
- Neue Schnellaktionen erfinden (nur bestehende fixen)
- Schnellaktionen auf anderen Seiten (nur Mein Tag)

## Backlog Items
- BL-319: Schnellaktionen Neuer Termin + Pruefung
- BL-320: E-Mail Compose-Sheet statt Listenseite

## Acceptance Criteria
1. "Neuer Termin" ist als Schnellaktion sichtbar und oeffnet Calendar-Event-Sheet
2. "Neue E-Mail" oeffnet Email-Compose-Sheet direkt
3. "Neuer Task" oeffnet Task-Erstellungs-Sheet direkt
4. "Neues Meeting" oeffnet Meeting-Sheet direkt
5. Keine Schnellaktion navigiert zu einer Listenseite
6. Sheets schliessen nach Erstellung und aktualisieren Mein Tag Daten

## Micro-Tasks

### MT-1: Audit bestehende Schnellaktionen
- Goal: Alle Schnellaktionen identifizieren und aktuelles Verhalten dokumentieren
- Files: Mein-Tag Seite/Komponenten (bestehend)
- Expected behavior: Liste aller Schnellaktionen mit aktuellem Ziel (Sheet vs. Navigation)
- Verification: Code-Review
- Dependencies: keine

### MT-2: Schnellaktionen auf Sheet-Pattern umstellen
- Goal: Alle Schnellaktionen oeffnen ihr jeweiliges Erstellungs-Sheet
- Files: Mein-Tag Schnellaktionen-Komponente, Sheet-Komponenten (bestehend)
- Expected behavior: Klick oeffnet Sheet, kein Router.push mehr
- Verification: Browser-Check — jede Aktion klicken, Sheet muss oeffnen
- Dependencies: MT-1

### MT-3: "Neuer Termin" Schnellaktion hinzufuegen
- Goal: Fehlende Schnellaktion "Neuer Termin" ergaenzen
- Files: Mein-Tag Schnellaktionen-Komponente
- Expected behavior: Icon + Label "Neuer Termin", oeffnet Calendar-Event-Sheet
- Verification: Browser-Check — Termin erstellen ueber Schnellaktion
- Dependencies: MT-2, SLC-311 (TimePicker)

## Technical Notes
- Sheet-Komponenten (EmailSheet, TaskSheet, MeetingSheet) sollten bereits existieren oder aus Workspace-Seiten extrahierbar sein
- Pattern: `useState` fuer Sheet-Open-State in Mein-Tag, kein globaler State noetig
- Nach erfolgreicher Erstellung: `router.refresh()` oder SWR revalidate
