# SLC-316 — Auto-Wiedervorlagen

## Slice Info
- Feature: FEAT-302, FEAT-109
- Version: V3.1
- Priority: High
- Dependencies: keine (unabhaengig von KI-Slices)
- Type: Frontend + Server Actions

## Goal
Nach Abschluss bestimmter Aktionen (Meeting erledigt, E-Mail gesendet) automatisch Wiedervorlage als Task erstellen. Zeitraum abhaengig von Kontakt-Prioritaet. Wiedervorlagen erscheinen in Mein Tag.

## Scope

### Included
1. Nach Meeting-Abschluss: "Naechster Schritt?" Dialog mit Vorschlaegen
2. Nach E-Mail-Versand: Follow-up-Task automatisch erstellen (wenn Follow-up-Datum gesetzt)
3. Zeitraum basierend auf Kontakt-Prioritaet: Hoch=2-3d, Mittel=5d, Niedrig=7d
4. Wiedervorlagen als normale Tasks (Typ: follow_up) in Mein Tag sichtbar
5. Konfigurierbarer Default-Zeitraum (spaeter in Settings)

### Excluded
- Bidirektionale Wiedervorlagen (eingehende E-Mail → Task, V4 mit IMAP)
- Auto-Reply-Erkennung (V4)
- Wiedervorlagen basierend auf Deal-Inaktivitaet (existiert bereits als Exception)

## Backlog Items
- BL-324: Automatische Wiedervorlagen nach Aktionen

## Acceptance Criteria
1. Meeting auf "completed" setzen → Dialog "Naechster Schritt?" erscheint
2. Dialog bietet Vorschlaege: "Follow-up in X Tagen", "Angebot senden", "Keine Aktion"
3. Bei Auswahl wird Task mit richtigem Due-Date erstellt
4. E-Mail mit Follow-up-Datum → Task wird automatisch erstellt
5. Follow-up-Zeitraum basiert auf Kontakt-Prioritaet (oder manuell ueberschreibbar)
6. Wiedervorlagen-Tasks erscheinen in Mein Tag am faelligen Tag
7. Task-Typ "follow_up" ist in Task-Liste filterbar

## Micro-Tasks

### MT-1: Follow-up-Logik Utility
- Goal: Berechnung des Follow-up-Datums basierend auf Kontakt-Prioritaet
- Files: `lib/follow-up.ts` (neu)
- Expected behavior: `calculateFollowUpDate(contactPriority, baseDate?)` → Date. Hoch=2d, Mittel=5d, Niedrig=7d.
- Verification: Unit-Test — alle Prioritaeten + Edge Cases
- Dependencies: keine

### MT-2: Post-Meeting-Dialog
- Goal: Nach Meeting-Completion ein "Naechster Schritt?" Sheet oeffnen
- Files: Meeting-Detail/Edit Komponente (bestehend erweitern), `components/follow-up-dialog.tsx` (neu)
- Expected behavior: Meeting auf "completed" → Dialog mit Vorschlaegen → Task erstellen
- Verification: Browser-Check — Meeting abschliessen, Dialog testen
- Dependencies: MT-1

### MT-3: Auto-Follow-up bei E-Mail-Versand
- Goal: Bei E-Mail mit Follow-up-Datum automatisch Task erstellen
- Files: E-Mail-Versand Server Action (bestehend erweitern)
- Expected behavior: E-Mail senden mit Follow-up-Datum → Task mit due_date wird erstellt
- Verification: E-Mail senden → Task in DB pruefen
- Dependencies: MT-1

### MT-4: Task-Typ "follow_up" + Filter
- Goal: Tasks um Typ-Feld erweitern, Wiedervorlagen filtern koennen
- Files: Task-Komponenten (bestehend), ggf. tasks-Schema erweitern
- Expected behavior: Follow-up-Tasks haben Typ "follow_up", filterbar in Task-Liste und Mein Tag
- Verification: Browser-Check — Filter in Task-Liste
- Dependencies: MT-2, MT-3

## Technical Notes
- tasks Tabelle: Pruefen ob `type` Feld existiert, sonst Schema-Erweiterung (ALTER TABLE tasks ADD COLUMN type TEXT DEFAULT 'manual')
- Falls Schema-Change: als Teil von MIG-007 dokumentieren
- Kontakt-Prioritaet: Pruefen wo gespeichert (contacts Tabelle, signals, oder fit_assessments)
- Dialog-Pattern: Aehnlich wie Confirm-before-write — Sheet mit Optionen, nicht automatisch im Hintergrund
