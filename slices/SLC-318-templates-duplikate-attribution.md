# SLC-318 — Templates + Duplikate + Attribution

## Slice Info
- Feature: FEAT-106, FEAT-107, FEAT-101, FEAT-102
- Version: V3.1
- Priority: Medium
- Dependencies: keine
- Type: Frontend + Backend (Schema-Erweiterung)

## Goal
Vier zusammengehoerende Datenqualitaets-Verbesserungen: E-Mail-Templates in 3 Sprachen, Angebots-Vorlagen in 3 Sprachen, Duplikat-Warnung bei Kontakt-/Firmen-Anlage, und strukturiertes Source/Attribution-Feld.

## Scope

### Included
**E-Mail-Templates (BL-129):**
1. Template-Verwaltung (CRUD) unter Settings oder E-Mail-Bereich
2. Pro Template: DE/NL/EN Versionen
3. Platzhalter: {{vorname}}, {{firma}}, {{nachname}}, etc.
4. Template-Auswahl beim E-Mail-Composing

**Duplikat-Erkennung (BL-131):**
5. Bei Kontakt-Anlage: Warnung wenn gleiche E-Mail existiert
6. Bei Firmen-Anlage: Warnung wenn gleicher Name existiert
7. Option: "Trotzdem anlegen" oder "Zum bestehenden Eintrag"

**Source/Attribution (BL-140):**
8. Kontakte + Firmen: Strukturiertes source-Feld (Dropdown)
9. Optionen: Empfehlung, LinkedIn, Event, Kaltakquise, Inbound, Kampagne
10. Optionales Kampagnen-Freitext-Feld

**Angebots-Vorlagen (BL-137):**
11. Proposal-Templates in DE/NL/EN
12. Sprache basierend auf Kontakt/Firma vorgeschlagen
13. Scope-Texte, Standard-Formulierungen pro Sprache

### Excluded
- Merge-Logik fuer Duplikate (nur Warnung, kein Auto-Merge)
- Source-basierte Auswertungen/Reports (V4)

## Backlog Items
- BL-129: E-Mail-Templates 3 Sprachen
- BL-137: Angebots-Vorlagen 3 Sprachen
- BL-131: Duplikat-Erkennung
- BL-140: Source/Attribution-Feld

## Acceptance Criteria
1. Templates CRUD funktioniert (Erstellen, Bearbeiten, Loeschen)
2. Jedes Template hat DE/NL/EN Tab
3. Platzhalter werden beim Einfuegen ersetzt
4. Kontakt-Anlage mit bestehender E-Mail → Warnung
5. Firmen-Anlage mit bestehendem Namen → Warnung
6. "Trotzdem anlegen" umgeht Warnung
7. Kontakte + Firmen haben strukturiertes source-Dropdown
8. Source-Werte sind konsistent filterbar

## Micro-Tasks

### MT-1: E-Mail-Templates Schema + CRUD
- Goal: DB-Tabelle email_templates + Server Actions fuer CRUD
- Files: Schema-Migration, Server Actions (neu)
- Expected behavior: Templates mit title, body_de, body_nl, body_en, placeholders speicherbar
- Verification: Templates erstellen + laden
- Dependencies: keine

### MT-2: Template-Verwaltungs-UI
- Goal: Settings-Seite oder E-Mail-Bereich fuer Template-Management
- Files: Template-Verwaltungs-Seite (neu)
- Expected behavior: Liste, Erstellen, Bearbeiten mit Sprach-Tabs, Loeschen
- Verification: Browser-Check
- Dependencies: MT-1

### MT-3: Template-Auswahl in E-Mail-Compose
- Goal: Template-Dropdown im E-Mail-Sheet, fuellt Body + Betreff
- Files: E-Mail-Sheet (bestehend erweitern)
- Expected behavior: Template auswaehlen → Body wird befuellt mit Platzhalter-Ersetzung
- Verification: Browser-Check — Template waehlen, Platzhalter durch echte Daten ersetzt
- Dependencies: MT-2

### MT-4: Duplikat-Erkennung
- Goal: Warnung bei Kontakt-/Firmen-Anlage wenn Duplikat erkannt
- Files: Kontakt-Sheet, Firmen-Sheet (bestehend erweitern)
- Expected behavior: Nach E-Mail/Name-Eingabe: Server-Check → Warnung mit Link zum Bestehenden
- Verification: Browser-Check — Duplikat anlegen, Warnung sehen
- Dependencies: keine

### MT-5: Source/Attribution Schema + UI
- Goal: Strukturiertes source-Feld auf Kontakte + Firmen
- Files: Schema-Migration (source_type + source_detail Felder), Kontakt-/Firmen-Formulare (erweitern)
- Expected behavior: Dropdown mit vordefinierten Quellen, optionales Freitext-Feld
- Verification: Browser-Check — Kontakt mit Source anlegen
- Dependencies: keine

## Technical Notes
- email_templates Tabelle: id, title, subject_de, subject_nl, subject_en, body_de, body_nl, body_en, placeholders (JSONB), created_by, created_at
- Duplikat-Check: Supabase RPC oder einfacher SELECT WHERE email = $1 / WHERE LOWER(name) = LOWER($1)
- Source-Feld: ALTER TABLE contacts ADD COLUMN source_type TEXT; ALTER TABLE contacts ADD COLUMN source_detail TEXT; (analog fuer companies)
- Schema-Changes: Dokumentieren als MIG-007 oder MIG-008
- Sprach-Erkennung: Kontakt hat ggf. ein language-Feld, sonst Default DE
