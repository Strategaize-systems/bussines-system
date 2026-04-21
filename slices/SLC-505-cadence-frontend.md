# SLC-505 — Cadence-Frontend

## Slice Info
- Feature: FEAT-501
- Priority: High
- Status: planned

## Goal
Cadence-Verwaltungs-UI: Template-Builder, Enrollment-Aktion auf Deal/Kontakt-Workspace, Enrollment-Uebersicht.

## Scope
- `/app/(app)/cadences/` — Cadence-Verwaltungsseite (Liste + Builder)
- Cadence-Builder: Schritte hinzufuegen/sortieren/konfigurieren (Drag-and-Drop optional)
- Enrollment-Uebersicht: Wer ist in welcher Cadence, welcher Schritt, Status
- Deal-/Kontakt-Workspace: "In Cadence einbuchen" Aktion + aktiver Enrollment-Status

## Out of Scope
- Cadence-Backend-Logik (SLC-504)
- Tracking-UI (SLC-507)
- Engagement-Indikatoren (SLC-507)

## Acceptance Criteria
- AC1: Cadence-Seite zeigt alle Cadences mit Name, Status, Step-Count, Enrollment-Count
- AC2: Cadence-Builder erlaubt Schritte hinzuzufuegen (E-Mail, Aufgabe, Wartezeit) mit Konfiguration
- AC3: Schritte koennen sortiert und geloescht werden
- AC4: E-Mail-Schritte koennen Template oder Inline-Text verwenden
- AC5: Enrollment-Uebersicht zeigt aktive Enrollments mit aktuellem Schritt und Status
- AC6: Deal-Workspace hat "In Cadence einbuchen" Button (oeffnet Cadence-Auswahl)
- AC7: Kontakt-Workspace hat "In Cadence einbuchen" Button
- AC8: Aktiver Enrollment-Status sichtbar auf Deal-/Kontakt-Workspace

## Dependencies
- SLC-504 (Cadence-Backend: Server Actions, Types)

## QA Focus
- Cadence erstellen → Schritte konfigurieren → speichern → Liste zeigt neue Cadence?
- Deal in Cadence einbuchen → Enrollment-Status sichtbar?
- Cadence bearbeiten → Schritte aendern → gespeichert?
- Responsive Verhalten der Cadence-Seite

### Micro-Tasks

#### MT-1: Cadence-Listenseite
- Goal: Uebersichtsseite mit allen Cadences
- Files: `cockpit/src/app/(app)/cadences/page.tsx`, `cockpit/src/components/cadences/cadence-list.tsx`
- Expected behavior: Tabelle mit Name, Status, Steps-Anzahl, Enrollments-Anzahl, Erstellt-Datum. New-Button.
- Verification: Seite aufrufen, Cadences sichtbar (oder leerer Zustand)
- Dependencies: none

#### MT-2: Cadence-Builder (Detail-Seite)
- Goal: Cadence erstellen/bearbeiten mit Step-Builder
- Files: `cockpit/src/app/(app)/cadences/[id]/page.tsx`, `cockpit/src/components/cadences/cadence-builder.tsx`, `cockpit/src/components/cadences/step-editor.tsx`
- Expected behavior: Name/Beschreibung editieren, Schritte hinzufuegen (Typ-Auswahl), Schritt-Konfiguration (Delay, Template, Text), Reihenfolge aendern, Speichern
- Verification: Cadence erstellen mit 3 Schritten, speichern, Seite neu laden → Schritte korrekt
- Dependencies: MT-1

#### MT-3: Enrollment-Uebersicht
- Goal: Seite/Tab mit aktiven Enrollments
- Files: `cockpit/src/components/cadences/enrollment-list.tsx`
- Expected behavior: Tabelle: Deal/Kontakt, Cadence, aktueller Schritt, Status, naechste Ausfuehrung. Filter nach Status.
- Verification: Enrollments sichtbar nach Einbuchung
- Dependencies: MT-1

#### MT-4: Workspace-Integration (Einbuchen + Status)
- Goal: "In Cadence einbuchen" Aktion + Enrollment-Status auf Deal/Kontakt-Workspace
- Files: `cockpit/src/components/cadences/enroll-button.tsx`, `cockpit/src/components/cadences/enrollment-badge.tsx`, Deal- und Kontakt-Workspace-Seiten
- Expected behavior: Button oeffnet Dialog mit Cadence-Auswahl. Nach Einbuchung: Badge zeigt aktiven Enrollment-Status.
- Verification: Deal-Workspace → Einbuchen → Badge sichtbar
- Dependencies: MT-2, MT-3
