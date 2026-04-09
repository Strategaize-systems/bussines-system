# SLC-309 — Firmen + Kontakt Workspace Upgrade

## Slice Info
- Feature: FEAT-303, FEAT-304
- Version: V3
- Priority: Medium
- Dependencies: SLC-306 (Deal-Workspace — fuer Deal-Links)
- Type: Frontend

## Goal
Bestehende Firmen- und Kontakt-Detailseiten um Deal-Listen und KI-Summary-Platzhalter erweitern.

## Scope

### Included
1. /companies/[id] — Neue Sektion "Deals":
   - Aktive Deals: Stage, Wert, Status
   - Vergangene Deals: Gewonnen/Verloren mit Wert
   - Deal-Klick oeffnet /deals/[id]
2. /contacts/[id] — Neue Sektion "Deals":
   - Analog zu Firmen (Deals wo contact_id = dieser Kontakt)
3. KI-Summary Slot (Platzhalter):
   - Leere Card mit "Verfuegbar ab V3.1" auf beiden Seiten
4. Server Action: getDealsByCompany(companyId), getDealsByContact(contactId)

### Excluded
- KI-generierte Firmen-/Kontakt-Summaries (V3.1, FEAT-315)
- Unified Timeline fuer Kontakte/Firmen (kann spaeter kommen)
- Aenderungen am bestehenden Layout der Seiten

## Backlog Items
- BL-307: Firmen-Workspace Deal-Liste
- BL-308: Kontakt-Workspace Deal-Liste

## Acceptance Criteria
1. /companies/[id] zeigt Deals-Sektion mit aktiven + vergangenen Deals
2. /contacts/[id] zeigt Deals-Sektion analog
3. Deal-Klick navigiert zu /deals/[id]
4. KI-Summary-Platzhalter sichtbar auf beiden Seiten
5. Bestehende Sektionen bleiben intakt
6. Leere Zustaende (keine Deals) werden sinnvoll behandelt

## Micro-Tasks

### MT-1: Server Actions fuer Deal-Listen
- Goal: getDealsByCompany() und getDealsByContact() erstellen
- Files: Bestehende Deal Server Actions (erweitern)
- Expected behavior: Liefert Deals mit Stage, Wert, Status, gruppiert nach aktiv/vergangen
- Verification: Test-Aufruf mit bekannter Firma/Kontakt
- Dependencies: keine (nutzt bestehende deals Tabelle)

### MT-2: Firmen-Workspace Deal-Sektion
- Goal: Deal-Liste auf /companies/[id] einbauen
- Files: Bestehende Company-Detail-Seite/Komponente
- Expected behavior: Aktive + vergangene Deals sichtbar, klickbar
- Verification: Browser-Check — Firma mit Deals oeffnen
- Dependencies: MT-1, SLC-306 (Deal-Workspace als Ziel)

### MT-3: Kontakt-Workspace Deal-Sektion + KI-Platzhalter
- Goal: Deal-Liste auf /contacts/[id] + KI-Slots auf beiden Seiten
- Files: Bestehende Contact-Detail-Seite, Company-Detail-Seite
- Expected behavior: Deal-Listen + "Verfuegbar ab V3.1" Card
- Verification: Browser-Check
- Dependencies: MT-1, MT-2

## Technical Notes
- Deal-Queries: Simple SELECT mit company_id/contact_id Filter, sortiert nach created_at DESC
- Gruppierung: aktiv = status IN ('active'), vergangen = status IN ('won', 'lost')
- Deal-Cards wiederverwendbar (gleiche Komponente fuer Firmen + Kontakte)
- KI-Slot: Einfache Card mit Text und Sparkles-Icon
