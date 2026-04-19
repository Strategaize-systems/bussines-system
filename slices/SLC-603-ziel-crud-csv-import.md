# SLC-603 — Ziel-CRUD + CSV-Import

## Slice Info
- Feature: FEAT-602
- Priority: High
- Estimated Effort: 1.5 Tage
- Dependencies: SLC-601 (Schema), SLC-602 (Produkt-Referenz)

## Goal

Ziele manuell anlegen, bearbeiten und stornieren. CSV-Import mit Template-Validierung und Preview. Ziel-Verwaltungsseite.

## Scope

- Server Actions: createGoal, updateGoal, cancelGoal, listGoals, importGoalsFromCSV
- Ziel-Verwaltungsseite (unter Analyse oder Settings — Entscheidung: /performance/goals)
- Manuelles Anlegen: Typ, Zeitraum, Sollwert, optional Produkt
- CSV-Import: Client-Side Parsing (Papa Parse), Validierung, Preview-Tabelle, Bestaetigung, Server Action
- Ziel-Quelle (manual/imported) sichtbar

## Out of Scope

- Ziel-Fortschritt-Berechnung (SLC-604)
- Ziel-Anzeige im Performance-Cockpit (SLC-606)

## Acceptance Criteria

1. Ziele koennen manuell angelegt werden (Typ, Zeitraum, Sollwert, opt. Produkt)
2. Ziele koennen bearbeitet werden
3. Ziele koennen storniert werden (Status cancelled, nicht geloescht)
4. Ziel-Liste zeigt alle Ziele mit Zeitraum-Filter
5. CSV-Import: Template-konformer CSV wird korrekt importiert
6. CSV-Import: Fehlerhafte Zeilen werden einzeln gemeldet, Rest importiert
7. CSV-Import: Preview-Tabelle vor Import sichtbar
8. Produkt-Referenz per Name matching (CSV) oder Dropdown (manuell)
9. Unique Constraint verhindert doppelte Ziele (gleicher Typ+Zeitraum+Produkt)
10. `npm run build` gruen

## QA-Fokus

- CRUD: Anlegen, Bearbeiten, Stornieren
- CSV-Import: Valide Datei, Datei mit Fehlern, leere Datei
- Edge Case: Ziel fuer nicht-existierendes Produkt im CSV → Fehler pro Zeile
- Edge Case: Doppeltes Ziel anlegen → DB-Constraint-Fehler sauber gefangen

### Micro-Tasks

#### MT-1: Ziel Server Actions
- Goal: CRUD-Server-Actions fuer goals-Tabelle
- Files: `app/actions/goals.ts`
- Expected behavior: createGoal, updateGoal, cancelGoal, listGoals funktionieren. Unique-Constraint-Fehler wird sauber gefangen und als User-Fehler gemeldet.
- Verification: `npm run build` gruen
- Dependencies: none

#### MT-2: CSV-Parser + Validierung
- Goal: Client-Side CSV-Parsing und Validierung
- Files: `lib/goals/csv-parser.ts`
- Expected behavior: parseGoalsCsv(csvString, products[]) → { valid: GoalImportRow[], errors: { line, message }[] }. Validiert type, period, period_start, target_value, product_name.
- Verification: Unit-Test oder Build-Check
- Dependencies: none

#### MT-3: Import-Server-Action
- Goal: Bulk-Insert validierter Ziele
- Files: `app/actions/goals.ts` (erweitern)
- Expected behavior: importGoalsFromCSV(rows) → { imported: N, errors: M }. Setzt source='imported'.
- Verification: `npm run build` gruen
- Dependencies: MT-1, MT-2

#### MT-4: Ziel-Verwaltungsseite
- Goal: /performance/goals mit Ziel-Liste + Anlegen/Bearbeiten + CSV-Import
- Files: `app/(app)/performance/goals/page.tsx`, `components/goals/goal-form.tsx`, `components/goals/goal-list.tsx`, `components/goals/csv-import-dialog.tsx`
- Expected behavior: Tabelle mit Zielen (Typ, Zeitraum, Sollwert, Produkt, Status, Quelle). Modal fuer manuelles Anlegen. CSV-Import-Dialog mit File-Upload, Preview-Tabelle, Fehler-Anzeige, Import-Button.
- Verification: Browser-Test: Ziel anlegen, CSV importieren, Fehlerfall testen
- Dependencies: MT-1, MT-2, MT-3
