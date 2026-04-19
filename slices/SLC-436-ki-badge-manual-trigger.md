# SLC-436 — Deal-Workspace KI-Badge + Manual Trigger

## Slice Info
- **Feature:** FEAT-402, FEAT-412
- **Version:** V4.3
- **Priority:** Medium
- **Estimated Effort:** 1 Tag
- **Dependencies:** SLC-431, SLC-432, SLC-434

## Goal

Deal-Workspace um KI-Badge-Anzeige erweitern: Properties die per KI-Approve geaendert wurden zeigen ein Badge (30-Tage-Fenster). Plus manueller "Signale extrahieren"-Button und API-Route.

## Scope

- KI-Badge-Komponente (kleines Sparkles-Icon + Tooltip)
- Deal-Header/Properties mit KI-Badge wo relevant (Stage, Value)
- API-Route `/api/signals/extract` fuer manuellen Trigger
- "Signale extrahieren"-Button im Deal-Workspace
- Activity-Query fuer Badge-Bestimmung (type=ai_applied, letzte 30 Tage)

## Out of Scope

- Signal-Extraktion-Logik (SLC-432 — wird hier nur aufgerufen)
- Queue-UI (SLC-435)

## Acceptance Criteria

1. KI-Badge erscheint auf Deal-Properties die in den letzten 30 Tagen per KI geaendert wurden
2. Tooltip zeigt: Datum der KI-Aenderung, Quelle (Meeting/E-Mail)
3. "Signale extrahieren"-Button ist im Deal-Workspace sichtbar
4. Button laedt letzte 5 Meetings + 10 E-Mails des Deals, ruft Extractor
5. Ergebnis-Feedback: "X Signale erkannt" oder "Keine neuen Signale"
6. API-Route ist authentifiziert und rate-limited
7. Build gruen

## Micro-Tasks

### MT-1: API-Route /api/signals/extract
- Goal: On-Demand Signal-Extraktion per Deal
- Files: `cockpit/src/app/api/signals/extract/route.ts`
- Expected behavior: POST { deal_id } → Laedt Deal-Kontext, letzte 5 Meetings + 10 E-Mails, ruft extractSignals pro Quelle, gibt Count zurueck
- Verification: API antwortet korrekt mit Signal-Count
- Dependencies: SLC-432

### MT-2: "Signale extrahieren"-Button
- Goal: Button im Deal-Workspace der die API aufruft
- Files: `cockpit/src/components/deals/deal-workspace.tsx` oder `deal-actions.tsx`
- Expected behavior: Button mit Sparkles-Icon, Loading-State waehrend Extraktion, Ergebnis-Toast ("3 Signale erkannt" oder "Keine neuen Signale")
- Verification: Button funktioniert, zeigt Feedback
- Dependencies: MT-1

### MT-3: KI-Badge-Komponente
- Goal: Wiederverwendbarer Badge fuer KI-geaenderte Properties
- Files: `cockpit/src/components/deals/ki-badge.tsx`
- Expected behavior: Kleines Sparkles-Icon (lila Gradient), Tooltip mit Datum + Quelle, sichtbar nur wenn AI-Activity in letzten 30 Tagen
- Verification: Badge rendert korrekt, Tooltip zeigt Infos
- Dependencies: none

### MT-4: KI-Badge in Deal-Header integrieren
- Goal: Badge auf Stage und Value im Deal-Header wenn KI-geaendert
- Files: `cockpit/src/components/deals/deal-header.tsx`
- Expected behavior: Laedt ai_applied Activities fuer Deal (letzte 30 Tage), zeigt Badge neben betroffenen Feldern
- Verification: Badge erscheint nach Approve in SLC-434, verschwindet nach 30 Tagen
- Dependencies: MT-3, SLC-434

## QA Focus

- KI-Badge zeigt nur tatsaechlich KI-geaenderte Properties
- "Signale extrahieren" funktioniert mit Deals die Meetings/E-Mails haben
- "Signale extrahieren" gibt sinnvolles Feedback bei Deals ohne Daten
- Rate-Limiting verhindert Missbrauch
- Bestehende Deal-Workspace-Funktionalitaet unveraendert
