# SLC-003 — Kontakte + Firmen CRUD

## Meta
- Feature: FEAT-001
- Priority: Blocker
- Status: planned
- Dependencies: SLC-001, SLC-002

## Goal
Kontakt- und Firmenverwaltung im Cockpit: Liste, Detail, Erstellen, Bearbeiten, Löschen, Suchen. Tags vergeben. Firma↔Kontakt Verknüpfung.

## Scope
- Kontakt-Liste (TanStack Table mit Suchen, Sortieren, Filter)
- Kontakt-Erstellen (Sheet/Modal mit Form)
- Kontakt-Detail (alle Daten auf einen Blick, Tags, zugeordnete Firma)
- Kontakt-Bearbeiten + Löschen
- Firmen-Liste (gleiche Patterns)
- Firmen-Detail (mit zugeordneten Kontakten)
- Server Actions für alle CRUD-Operationen
- Tag-Input-Komponente

## Out of Scope
- Aktivitäten-Timeline (SLC-005)
- Dokument-Upload (SLC-005)
- Pipeline-Zuordnung auf Kontakt-Detail (SLC-004)

### Micro-Tasks

#### MT-1: Server Actions für Kontakte
- Goal: CRUD Server Actions für contacts-Tabelle
- Files: `cockpit/app/(app)/contacts/actions.ts`
- Expected behavior: createContact, getContacts, getContact, updateContact, deleteContact funktionieren
- Verification: Server Actions aufrufbar, Daten in DB
- Dependencies: SLC-002

#### MT-2: Kontakt-Liste
- Goal: Tabelle mit TanStack Table, Suche, Sortierung
- Files: `cockpit/app/(app)/contacts/page.tsx`, `cockpit/app/(app)/contacts/columns.tsx`, `cockpit/components/ui/data-table.tsx`
- Expected behavior: Kontakte als Tabelle mit Name, Firma, E-Mail, Tags. Suche filtert. Sortierbar.
- Verification: Seite zeigt Seed-Kontakte, Suche funktioniert
- Dependencies: MT-1

#### MT-3: Kontakt-Erstellen + Bearbeiten
- Goal: Sheet/Modal mit Form (React Hook Form + Zod)
- Files: `cockpit/app/(app)/contacts/contact-form.tsx`, `cockpit/app/(app)/contacts/contact-sheet.tsx`
- Expected behavior: Formular mit allen Feldern, Validierung, Submit speichert in DB
- Verification: Neuer Kontakt erstellen → erscheint in Liste
- Dependencies: MT-1, MT-2

#### MT-4: Kontakt-Detail
- Goal: Detail-Seite mit allen Kontakt-Daten, Tags, zugehöriger Firma
- Files: `cockpit/app/(app)/contacts/[id]/page.tsx`
- Expected behavior: Zeigt alle Felder, verlinkt zur Firma, Tags als Badges
- Verification: Klick auf Kontakt → Detail-Seite korrekt
- Dependencies: MT-1

#### MT-5: Server Actions für Firmen
- Goal: CRUD Server Actions für companies-Tabelle
- Files: `cockpit/app/(app)/companies/actions.ts`
- Expected behavior: createCompany, getCompanies, getCompany, updateCompany, deleteCompany
- Verification: Server Actions funktional
- Dependencies: SLC-002

#### MT-6: Firmen-Liste + Detail
- Goal: Firmen-Tabelle und Detail-Seite (mit zugeordneten Kontakten)
- Files: `cockpit/app/(app)/companies/page.tsx`, `cockpit/app/(app)/companies/columns.tsx`, `cockpit/app/(app)/companies/[id]/page.tsx`, `cockpit/app/(app)/companies/company-form.tsx`
- Expected behavior: Firmen als Tabelle, Detail zeigt Firma + zugehörige Kontakte
- Verification: Firmen-Liste + Detail funktionieren
- Dependencies: MT-5, MT-2 (data-table Reuse)

#### MT-7: Tag-Input-Komponente
- Goal: Reusable Tag-Input für Kontakte und Firmen
- Files: `cockpit/components/ui/tag-input.tsx`
- Expected behavior: Tags hinzufügen, entfernen, als Text[] gespeichert
- Verification: Tag-Input funktioniert in Kontakt- und Firmen-Formularen
- Dependencies: MT-3
