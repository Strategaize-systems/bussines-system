# SLC-435 — Unified Queue UI

## Slice Info
- **Feature:** FEAT-402
- **Version:** V4.3
- **Priority:** High
- **Estimated Effort:** 1-1.5 Tage
- **Dependencies:** SLC-431, SLC-434

## Goal

Mein Tag KI-Wiedervorlagen-Bereich erweitern: Insight-Vorschlaege (PropertyChangeCard) neben bestehenden Followup- und Gatekeeper-Actions anzeigen. Confidence/Reasoning/Source, Approve/Reject-Buttons, Batch-Approve.

## Scope

- PropertyChangeCard-Komponente (Aenderung alt→neu, Confidence-Badge, Reasoning, Source-Link)
- Unified Queue: bestehende followup-suggestions.tsx erweitern oder neue insight-suggestions.tsx daneben
- Batch-Approve-Bar (Checkbox-Selection + Button)
- Confidence-Badge (hoch >=0.7, mittel >=0.4, niedrig)
- Source-Link zu Meeting/E-Mail

## Out of Scope

- Deal-Workspace KI-Badge (SLC-436)
- Signal-Extraktion-Logik (SLC-432, SLC-433)

## Acceptance Criteria

1. PropertyChangeCard zeigt: Entity-Name, Feld, alter Wert → neuer Wert, Confidence-Badge, Reasoning, Source-Link
2. Approve-Button ruft approveInsightAction → UI-Feedback + Item verschwindet
3. Reject-Button ruft rejectInsightAction → UI-Feedback + Item verschwindet
4. Batch-Approve: Mehrere Items per Checkbox waehlen, ein Klick genehmigt alle
5. Bestehende Followup-/Gatekeeper-Cards unveraendert
6. Empty State wenn keine Insight-Vorschlaege vorhanden
7. Loading State waehrend Approve/Reject
8. Style Guide V2 konform (Gradient-Icons, Cards, Badges)

## Micro-Tasks

### MT-1: PropertyChangeCard-Komponente
- Goal: Wiederverwendbare Card fuer einen Insight-Vorschlag
- Files: `cockpit/src/app/(app)/mein-tag/property-change-card.tsx`
- Expected behavior: Zeigt Entity-Link, Feld-Label, old→new mit Pfeil, Confidence-Badge (gruen/gelb/rot), Reasoning-Text (expandable), Source-Link (Meeting/E-Mail), Approve/Reject-Buttons
- Verification: Komponente rendert korrekt mit Test-Daten
- Dependencies: SLC-431/MT-3

### MT-2: InsightSuggestions-Container
- Goal: Container der alle pending Insight-Items laedt und PropertyChangeCards rendert
- Files: `cockpit/src/app/(app)/mein-tag/insight-suggestions.tsx`
- Expected behavior: Laedt Queue-Items mit source IN (signal_meeting, signal_email, signal_manual), Status=pending, rendert als PropertyChangeCards, Batch-Checkbox-State
- Verification: Komponente laed und rendert Items korrekt
- Dependencies: MT-1, SLC-434/MT-2

### MT-3: Batch-Approve-Bar
- Goal: Batch-Aktions-Leiste wenn Items selektiert sind
- Files: `cockpit/src/app/(app)/mein-tag/insight-suggestions.tsx`
- Expected behavior: Sticky Bar unten mit "X ausgewaehlt — Alle genehmigen" Button, ruft batchApproveInsightActions
- Verification: Batch-Approve funktioniert, Items verschwinden
- Dependencies: MT-2, SLC-434/MT-4

### MT-4: Mein-Tag-Integration
- Goal: InsightSuggestions in Mein Tag einbinden
- Files: `cockpit/src/app/(app)/mein-tag/mein-tag-client.tsx`
- Expected behavior: InsightSuggestions-Container erscheint im KI-Workspace-Bereich neben bestehenden Followup-Suggestions
- Verification: Mein Tag zeigt alle drei Queue-Typen (Followup, Gatekeeper, Insight)
- Dependencies: MT-2

### MT-5: Confidence-Badge-Komponente
- Goal: Wiederverwendbarer Confidence-Badge
- Files: `cockpit/src/app/(app)/mein-tag/property-change-card.tsx`
- Expected behavior: Badge mit Gradient-Farbe: >=0.7 gruen "Hoch", >=0.4 gelb "Mittel", <0.4 rot "Niedrig"
- Verification: Korrekte Farbe fuer verschiedene Confidence-Werte
- Dependencies: none

## QA Focus

- PropertyChangeCard zeigt korrekte Daten (kein Rendering-Fehler bei leeren/null Feldern)
- Approve/Reject aktualisiert UI sofort (optimistic update oder revalidate)
- Batch-Approve funktioniert mit 1, 5, 10 Items
- Bestehende Mein-Tag-Funktionalitaet unveraendert
- Mobile/Responsive: Cards sind auf kleineren Screens lesbar
