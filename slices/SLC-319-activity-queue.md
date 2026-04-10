# SLC-319 — Activity-Queue / Focus View

## Slice Info
- Feature: FEAT-302
- Version: V3.1
- Priority: Medium
- Dependencies: SLC-316 (Auto-Wiedervorlagen fuer reichere Queue)
- Type: Frontend + Server Actions

## Goal
Dedizierte "Abarbeiten"-Ansicht: Die naechsten Aktionen als fokussierte Queue. Deal + Kontakt + was zu tun ist. Nach Erledigung springt zur naechsten Aktion. Wie Pipedrive Focus View.

## Scope

### Included
1. Focus-View als eigene Seite oder Mein-Tag-Modus
2. Zeigt Top-5 (oder konfigurierbar) naechste Aktionen
3. Pro Aktion: Deal-Titel, Kontakt, Firma, Was zu tun ist
4. "Erledigt" → naechste Aktion wird geladen
5. "Ueberspringen" → naechste, uebersprungene kommt spaeter
6. Quick-Actions direkt in der Queue (E-Mail senden, Task abschliessen, Meeting notieren)

### Excluded
- Automatische Priorisierung durch KI (V4)
- Gamification (Streaks, Punkte)
- Team-Queue (Single-User)

## Backlog Items
- BL-132: Activity-Queue / Focus View

## Acceptance Criteria
1. Focus-View zeigt priorisierte naechste Aktionen
2. Jede Aktion zeigt Deal + Kontakt + Aufgabe
3. "Erledigt" schliesst aktuelle Aktion, laedt naechste
4. "Ueberspringen" verschiebt Aktion ans Ende
5. Quick-Actions (E-Mail, Task-Complete) funktionieren in der Queue
6. Leere Queue zeigt "Alles erledigt" Nachricht
7. Erreichbar ueber Navigation oder Mein-Tag-Button

## Micro-Tasks

### MT-1: Queue-Logik Server Action
- Goal: Priorisierte Aktions-Queue berechnen
- Files: `actions/focus-queue-actions.ts` (neu)
- Expected behavior: `getFocusQueue(limit)` → Sortierte Liste von faelligen Tasks, Follow-ups, ueberfaelligen Items mit Deal-/Kontakt-Kontext
- Verification: Daten-Check — richtige Sortierung und Kontext
- Dependencies: keine

### MT-2: Focus-View UI
- Goal: Fokussierte Abarbeiten-Ansicht als Seite oder Modal
- Files: `app/(authenticated)/focus/page.tsx` (neu) oder `components/mein-tag/focus-view.tsx` (neu)
- Expected behavior: Card-basierte Ansicht, ein Item im Fokus, Aktion-Buttons unten
- Verification: Browser-Check — Queue durcharbeiten
- Dependencies: MT-1

### MT-3: Quick-Actions in Queue
- Goal: Direkte Aktionen (E-Mail senden, Task erledigen) ohne View-Wechsel
- Files: Focus-View Komponente (erweitern)
- Expected behavior: Buttons "E-Mail senden", "Als erledigt markieren", "Meeting eintragen" oeffnen Sheet/Dialog
- Verification: Browser-Check — Aktion aus Queue heraus ausfuehren
- Dependencies: MT-2

### MT-4: Navigation + Mein-Tag-Integration
- Goal: Focus-View erreichbar machen
- Files: Navigation-Komponente (erweitern), Mein-Tag (Button hinzufuegen)
- Expected behavior: "Jetzt abarbeiten" Button in Mein Tag → Focus-View
- Verification: Browser-Check — Navigation funktioniert
- Dependencies: MT-2

## Technical Notes
- Queue-Sortierung: 1. Ueberfaellige (nach Alter), 2. Heute faellig (nach Prioritaet), 3. Follow-ups (nach Datum)
- Kontext-Laden: Pro Queue-Item ein Join auf deals + contacts + companies (eine Server Action)
- "Ueberspringen": Client-Side-State (kein DB-Write noetig), uebersprungene Items ans Array-Ende
- Spaeter erweiterbar um KI-Priorisierung (V4)
