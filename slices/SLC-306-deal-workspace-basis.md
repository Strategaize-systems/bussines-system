# SLC-306 — Deal-Workspace Basis

## Slice Info
- Feature: FEAT-301 (partial)
- Version: V3
- Priority: High
- Dependencies: SLC-301 (Schema), SLC-303 (Navigation — "Alle Deals" Link)
- Type: Frontend + Server Actions

## Goal
Eigene Route /deals/[id] als zentraler Arbeitsort fuer jeden Deal. Header, Timeline, Tasks, Direktaktionen. Ersetzt DealDetailSheet als primaere Deal-Ansicht.

## Scope

### Included
1. /deals/[id] Route — eigene Workspace-Seite
2. Deal-Header: Status-Badge, Stage-Badge, Wert, Wahrscheinlichkeit, Firma (Link), Kontakt (Link)
3. Tabs-Layout:
   - Timeline Tab: Activities + E-Mails + Proposals + Signals + Meetings chronologisch
   - Tasks Tab: Deal-verknuepfte Tasks mit Erledigt-Button
   - Angebote Tab: Proposals fuer diesen Deal
   - Dokumente Tab: Verknuepfte Dokumente
   - Bearbeiten Tab: Deal-Edit-Form (bestehende Felder)
4. Direktaktionen-Leiste: + Task, + E-Mail, + Notiz/Activity, + Meeting (oeffnet Meeting-Form aus SLC-305), Stage-Wechsel Dropdown
5. Pipeline Kanban-Card Klick → Redirect auf /deals/[id] statt DealDetailSheet
6. Zurueck-Button zur Pipeline

### Excluded
- KI-Briefing Panel (SLC-307)
- Prozess-Check Panel (SLC-307)
- DealDetailSheet komplett entfernen (bleibt als Fallback vorerst)

## Backlog Items
- BL-301: Deal-Workspace Route /deals/[id]

## Acceptance Criteria
1. /deals/[id] oeffnet eigene Seite (kein Sheet/Modal)
2. Deal-Header zeigt alle relevanten Kopfdaten
3. Timeline Tab zeigt Activities + E-Mails + Proposals + Signals chronologisch
4. Tasks Tab zeigt Deal-verknuepfte Tasks mit Status-Toggle
5. Alle Tabs funktional und mit echten Daten
6. Direktaktionen erstellen neue Objekte korrekt
7. Kanban-Card Klick oeffnet /deals/[id]
8. Zurueck-Button fuehrt zur Pipeline

## Micro-Tasks

### MT-1: Route + Layout + Header
- Goal: /deals/[id] Route mit Deal-Header-Komponente
- Files: `app/(main)/deals/[id]/page.tsx`, `components/deals/deal-header.tsx`
- Expected behavior: Seite laedt, zeigt Deal-Kopfdaten (getDealWithRelations wiederverwendet)
- Verification: Browser-Check — /deals/[id] mit echtem Deal
- Dependencies: keine (nutzt bestehende Server Actions)

### MT-2: Timeline Tab
- Goal: Chronologische Darstellung aller Deal-Events
- Files: `components/deals/deal-timeline.tsx`
- Expected behavior: Activities, E-Mails, Proposals, Signals, Meetings gemischt nach Datum
- Verification: Browser-Check — Events korrekt sortiert
- Dependencies: MT-1

### MT-3: Tasks + Angebote + Dokumente + Edit Tabs
- Goal: Restliche Tabs mit echten Daten
- Files: `components/deals/deal-tasks.tsx`, `components/deals/deal-proposals.tsx`, `components/deals/deal-documents.tsx`, `components/deals/deal-edit.tsx`
- Expected behavior: Jeder Tab zeigt verknuepfte Objekte, Tasks haben Erledigt-Toggle
- Verification: Browser-Check — alle Tabs mit Daten
- Dependencies: MT-1

### MT-4: Direktaktionen-Leiste
- Goal: Action-Buttons die neue Objekte erstellen
- Files: `components/deals/deal-actions.tsx`
- Expected behavior: + Task oeffnet Task-Form, + E-Mail oeffnet E-Mail-Form, + Activity oeffnet Activity-Form, + Meeting oeffnet Meeting-Form (SLC-305), Stage-Dropdown wechselt Stage
- Verification: Browser-Check — Aktionen funktional
- Dependencies: MT-1, SLC-305 (fuer Meeting-Form)

### MT-5: Pipeline Redirect + Navigation
- Goal: Kanban-Card Klick oeffnet /deals/[id], Zurueck-Button
- Files: Bestehende Pipeline-Komponente (DealCard oder aehnlich)
- Expected behavior: Klick auf Deal-Card → navigiert zu /deals/[id]. Zurueck-Button → letzte Pipeline-Seite
- Verification: Browser-Check — Klick-Flow
- Dependencies: MT-1

## Technical Notes
- Bestehende getDealWithRelations() liefert Deal + Activities + Proposals + Signals + Emails
- Tasks: Zusaetzliche Query mit getTasks({ deal_id }) noetig
- Meetings: getMeetings({ deal_id }) aus SLC-305
- DealDetailSheet bleibt vorerst im Code (nicht entfernen), wird aber nicht mehr primaer genutzt
- Timeline: Alle Objekte bekommen ein einheitliches { date, type, data } Format fuer Sortierung
