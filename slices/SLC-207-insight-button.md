# SLC-207 — Insight an System 4 senden

## Meta
- Feature: BL-142
- Priority: High
- Status: planned
- Dependencies: none

## Goal
Button "An Intelligence senden" auf verlorenen Deals, Gesprächsnotizen und manuellen Notizen. Strukturierter Export an System 4.

## Scope
- "Insight senden" Button auf Deal-Detail (bei won/lost)
- "Insight senden" Button auf Activity-Items (bei Gesprächen)
- Insight-Sheet: Kategorie wählen (Marktfeedback, Produktfeedback, Wettbewerb, Prozess)
- Export als JSON-Datei in /exports/ Verzeichnis (später REST-API zu System 4)
- Activity-Log: "Insight gesendet" als Activity

## Out of Scope
- REST-API Integration mit System 4 (späterer Schritt)
- Automatische Insight-Erkennung

### Micro-Tasks

#### MT-1: Insight-Sheet Komponente
- Goal: Wiederverwendbares Sheet mit Kategorie-Auswahl + Freitext
- Files: `cockpit/src/components/insights/insight-sheet.tsx`
- Expected behavior: Kategorie wählen, optionaler Kommentar, Senden
- Verification: Build OK
- Dependencies: none

#### MT-2: Server Action saveInsight + Export
- Goal: Insight als JSON speichern
- Files: `cockpit/src/app/(app)/fit-assessment/insight-actions.ts`
- Expected behavior: JSON mit Kategorie, Quelle, Inhalt, Timestamp
- Verification: Build OK
- Dependencies: MT-1

#### MT-3: Button-Integration auf Deals + Activities
- Goal: Insight-Button auf verlorenen Deals und Gesprächs-Activities
- Files: `cockpit/src/app/(app)/pipeline/pipeline-view.tsx`, `cockpit/src/components/activities/activity-item.tsx`
- Expected behavior: Button sichtbar bei relevanten Items
- Verification: Build OK
- Dependencies: MT-1, MT-2
