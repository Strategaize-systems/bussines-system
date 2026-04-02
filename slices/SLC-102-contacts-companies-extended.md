# SLC-102 — Kontakte + Firmen erweitern

## Meta
- Feature: FEAT-101, FEAT-102
- Priority: Blocker
- Status: done
- Dependencies: SLC-101

## Goal
Bestehende Kontakt- und Firmen-Formulare + Detail-Seiten um die neuen Felder erweitern. Beziehungstypen, Eignungsbewertung, Multiplikator-Flag, Blueprint-Fit.

## Scope
- Kontakt-Formular: +Beziehungstyp, Rolle, Quelle, Region, Sprache, Vertrauen, Empfehlungsfähigkeit, is_multiplier, Multiplikator-Typ
- Kontakt-Detail: Neue Felder anzeigen, Beziehungstyp als Badge
- Firmen-Formular: +Eignungsfelder (Exit, KI-Reife, Budget, Champion, Blueprint-Fit)
- Firmen-Detail: Eignungsbewertung als Ampel-Übersicht
- Kontakt-Liste: Filter nach Beziehungstyp
- Firmen-Liste: Filter nach Blueprint-Fit
- Server Actions erweitern (create/update mit neuen Feldern)

### Micro-Tasks

#### MT-1: Kontakt Server Actions + Types erweitern
- Goal: Contact-Type + createContact/updateContact um neue Felder erweitern
- Files: `cockpit/src/app/(app)/contacts/actions.ts`
- Expected behavior: Neue Felder werden gespeichert und geladen
- Verification: Build OK
- Dependencies: SLC-101/MT-1

#### MT-2: Kontakt-Formular erweitern
- Goal: Neue Felder im ContactForm (Beziehungstyp-Select, Vertrauen, is_multiplier Toggle)
- Files: `cockpit/src/app/(app)/contacts/contact-form.tsx`
- Expected behavior: Formular zeigt alle neuen Felder, Beziehungstyp als Dropdown
- Verification: Build OK
- Dependencies: MT-1

#### MT-3: Kontakt-Detail erweitern
- Goal: Neue Felder auf Detail-Seite anzeigen (Beziehungstyp Badge, Vertrauen, letzte Interaktion)
- Files: `cockpit/src/app/(app)/contacts/[id]/page.tsx`
- Expected behavior: Detail zeigt Beziehungstyp, Vertrauen, Empfehlungsfähigkeit
- Verification: Build OK
- Dependencies: MT-1

#### MT-4: Firmen Server Actions + Types erweitern
- Goal: Company-Type + CRUD um Eignungsfelder erweitern
- Files: `cockpit/src/app/(app)/companies/actions.ts`
- Expected behavior: Eignungsfelder werden gespeichert und geladen
- Verification: Build OK
- Dependencies: SLC-101/MT-1

#### MT-5: Firmen-Formular + Detail erweitern
- Goal: Eignungsfelder im Formular + Ampel-Anzeige auf Detail-Seite
- Files: `cockpit/src/app/(app)/companies/company-form.tsx`, `cockpit/src/app/(app)/companies/[id]/page.tsx`
- Expected behavior: Blueprint-Fit als farbige Ampel, Eignungsfelder editierbar
- Verification: Build OK
- Dependencies: MT-4

#### MT-6: Kontakt-/Firmen-Listen Filter
- Goal: Filter-Dropdowns über den Listen (Beziehungstyp, Blueprint-Fit)
- Files: `cockpit/src/app/(app)/contacts/contacts-client.tsx`, `cockpit/src/app/(app)/companies/companies-client.tsx`
- Expected behavior: Filter reduziert angezeigte Einträge
- Verification: Build OK
- Dependencies: MT-2, MT-5
