# SLC-202 — Deal-Detail-Popup

## Meta
- Feature: BL-118
- Priority: Blocker
- Status: done
- Dependencies: SLC-201

## Goal
Klick auf Kanban-Card öffnet großes Sheet mit allen Deal-Details: Kontaktdaten, Firma, Interaktionen, E-Mails, Angebote, Dokumente, Signale, Stage-History. Direkt bearbeitbar.

## Scope
- Großes Sheet (sm:max-w-2xl) statt kleinem Edit-Sheet
- Tab-Navigation: Details | Aktivitäten | Angebote | Dokumente
- Kontakt/Firma-Daten inline sichtbar
- Stage-History (aus Activities type=stage_change)
- Bearbeitbar: Deal-Felder direkt änderbar
- Nach Schließen: Pipeline aktualisiert (revalidatePath)

## Out of Scope
- Eigene URL/Route für Deal-Detail (bleibt Sheet/Modal)

### Micro-Tasks

#### MT-1: getDealWithRelations Server Action
- Goal: Einen Deal mit allen verknüpften Daten laden
- Files: `cockpit/src/app/(app)/pipeline/actions.ts`
- Expected behavior: Returns Deal + Contact + Company + Activities + Proposals + Documents + Signals
- Verification: Build OK
- Dependencies: none

#### MT-2: Deal-Detail-Sheet Komponente
- Goal: Großes Sheet mit Tab-Navigation
- Files: `cockpit/src/app/(app)/pipeline/deal-detail-sheet.tsx`
- Expected behavior: 4 Tabs, Kontaktdaten-Card, Stage-History Timeline
- Verification: Build OK
- Dependencies: MT-1

#### MT-3: Pipeline-View Integration
- Goal: Kanban-Card Klick öffnet Detail-Sheet statt Edit-Sheet
- Files: `cockpit/src/app/(app)/pipeline/pipeline-view.tsx`
- Expected behavior: Klick → Detail-Sheet mit vollem Kontext
- Verification: Build OK
- Dependencies: MT-2
