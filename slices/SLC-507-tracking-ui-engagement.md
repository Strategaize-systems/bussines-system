# SLC-507 — Tracking-UI + Engagement-Indikatoren

## Slice Info
- Feature: FEAT-506, FEAT-501
- Priority: Medium
- Status: planned

## Goal
Open/Click-Tracking-Status auf E-Mail-Detail und in Timelines anzeigen. Cadence-Enrollment-Status auf Deal-/Kontakt-Workspace integrieren. Engagement-Indikatoren fuer bessere Vertriebssteuerung.

## Scope
- E-Mail-Detail: Tracking-Status (geoeffnet/nicht geoeffnet, Klick-Zaehler, Zeitstempel)
- E-Mail-Liste: Tracking-Badge (Icon: geoeffnet/ungeoeffnet)
- Kontakt-/Deal-Workspace Timeline: Engagement-Indikator auf E-Mail-Eintraegen
- Cadence-Enrollment-Status auf Deal-/Kontakt-Workspace (wenn nicht in SLC-505 abgedeckt)
- assignment_source Badge auf E-Mail-Inbox (exact/ki/manual)

## Out of Scope
- Tracking-Backend (SLC-502)
- Detailliertes Engagement-Scoring
- A/B-Testing

## Acceptance Criteria
- AC1: E-Mail-Detail zeigt "3× geoeffnet, 1 Link geklickt" oder "Nicht geoeffnet"
- AC2: E-Mail-Liste zeigt Tracking-Badge (gruenes Auge = geoeffnet, graues = nicht)
- AC3: Klick-Details zeigen welcher Link wann geklickt wurde
- AC4: Timeline zeigt Engagement-Indikator auf gesendeten E-Mails
- AC5: assignment_source sichtbar in E-Mail-Inbox (Badge: "Exakt", "KI 85%", "Manuell")
- AC6: Cadence-Enrollment-Status auf Workspace aktualisiert sich

## Dependencies
- SLC-502 (Tracking-Events in DB)
- SLC-503 (assignment_source in email_messages)
- SLC-505 (Cadence-Frontend: Enrollment-Badge, falls nicht dort abgedeckt)

## QA Focus
- E-Mail senden → Tracking-Event simulieren → UI zeigt korrekte Daten?
- Mehrere Opens → Zaehler stimmt?
- Klick auf Link → Click-Event mit URL sichtbar?
- assignment_source Badge korrekt (exact/ki/manual)?

### Micro-Tasks

#### MT-1: Tracking-Status-Komponenten
- Goal: Wiederverwendbare Komponenten fuer Tracking-Anzeige
- Files: `cockpit/src/components/email/tracking-badge.tsx`, `cockpit/src/components/email/tracking-detail.tsx`
- Expected behavior: TrackingBadge zeigt Icon + Kurztext. TrackingDetail zeigt Events-Liste mit Zeitstempel.
- Verification: Komponenten rendern mit Mock-Daten
- Dependencies: none

#### MT-2: E-Mail-Detail + Liste Integration
- Goal: Tracking-Status auf E-Mail-Detail-Seite und in E-Mail-Liste einbauen
- Files: `cockpit/src/app/(app)/emails/page.tsx` (oder zustaendige Komponenten), E-Mail-Detail-Komponente
- Expected behavior: Liste zeigt TrackingBadge pro E-Mail. Detail zeigt TrackingDetail mit allen Events.
- Verification: E-Mail-Seite aufrufen, Badges sichtbar, Detail-Click zeigt Events
- Dependencies: MT-1

#### MT-3: Assignment-Source Badge
- Goal: Zuordnungsquelle auf E-Mail-Inbox sichtbar machen
- Files: `cockpit/src/components/email/assignment-badge.tsx`, E-Mail-Inbox-Komponente
- Expected behavior: Badge zeigt "Exakt", "KI 85%", "Manuell" oder "Nicht zugeordnet" basierend auf assignment_source + ai_match_confidence
- Verification: E-Mails mit verschiedenen assignment_source-Werten pruefen
- Dependencies: none

#### MT-4: Timeline-Engagement-Indikator
- Goal: Engagement-Info auf E-Mail-Eintraegen in der Timeline
- Files: Workspace-Timeline-Komponente(n)
- Expected behavior: Gesendete E-Mails in Timeline zeigen kleines Tracking-Icon (geoeffnet/nicht)
- Verification: Deal-/Kontakt-Workspace Timeline pruefen
- Dependencies: MT-1
