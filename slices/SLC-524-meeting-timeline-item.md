# SLC-524 — MeetingTimelineItem (UI-Parity zu CallTimelineItem)

## Meta
- Feature: FEAT-524
- Priority: Medium
- Status: planned
- Created: 2026-04-25

## Goal

Eine neue Komponente `MeetingTimelineItem` rendert Meeting-Activities in der Deal-Timeline mit denselben Details wie `CallTimelineItem`: Decisions, Action Items, Key Topics, Transkript-Toggle. Da Meeting-Summary-Schema bit-identisch zu Call-Summary ist (DEC-087), wird das `meeting.ai_summary`-Objekt direkt gerendert — kein Mapping-Layer. Backwards Compatibility fuer alte Meetings ohne `ai_summary` ist Pflicht.

## Scope

- `cockpit/src/components/meetings/meeting-timeline-item.tsx` neu anlegen
- Render-Logic 1:1 von `cockpit/src/components/calls/call-timeline-item.tsx` uebernehmen mit folgenden Aenderungen:
  - Icon: `Calendar` (statt `Phone`)
  - Type-Badge: "Meeting" (statt "Anruf")
  - Direction-Logic: kein `direction`-Begriff bei Meetings → Title aus `meeting.title` (oder Fallback)
  - Color-Theme: passend zur bestehenden Meeting-Visualisierung in `unified-timeline.tsx` (z.B. blue/indigo statt green)
- Robust gegen `meeting.ai_summary == null` (alte Pre-Bedrock-Meetings) — rendert Title + Datum, keinen Summary-Block
- Integration in `unified-timeline.tsx`: Wenn `activity_type === 'meeting'`, rendert `MeetingTimelineItem` statt der bestehenden Inline-Darstellung
- Hover-/Expand-Verhalten identisch zu CallTimelineItem
- Status-Badge-Logik analog (KI-Analyse / wird verarbeitet / Fehler), mit Fallback fuer alte Meetings ohne `summary_status`

## Out of Scope

- Aenderung am Meeting-Summary-Schema (bereits aktuell durch DEC-082)
- Aenderung am Bedrock-Summary-Generator
- Schema-Migration (kein DB-Touch)
- Aenderung am CallTimelineItem
- Aenderung an anderen Timeline-Items (E-Mail, Activity etc.)

## Acceptance Criteria

- AC1: `MeetingTimelineItem` rendert Meeting mit `ai_summary` analog zu CallTimelineItem (Decisions, Action Items, Next Step, Key Topics als Badges, Transkript-Toggle)
- AC2: Mit `ai_summary == null` rendert die Komponente nur Title + Datum + "Meeting"-Badge, kein Expand
- AC3: Mit `ai_summary` aber leeren Feldern (z.B. nur outcome) rendert nur die nicht-leeren Bloecke
- AC4: Icon ist `Calendar` (nicht `Phone`); Type-Badge zeigt "Meeting"
- AC5: Color-Theme ist konsistent zu bestehender Meeting-Darstellung
- AC6: `unified-timeline.tsx` rendert die neue Komponente fuer `type === "meeting"`
- AC7: Bestehende `unified-timeline.tsx`-Logik fuer andere Types (call, email, signal, activity) ist unveraendert
- AC8: Expand/Collapse, Hover-Effekt, Spacing-Regeln sind visuell identisch zu CallTimelineItem
- AC9: Pre-Bedrock-Meetings (ohne `ai_summary` und ohne `summary_status`) rendern ohne Errors
- AC10: TypeScript-Kompilation gruen; keine `any`-Casts ausser dort wo CallTimelineItem auch welche hat

## Dependencies

- Keine externen Abhaengigkeiten
- Kein anderer V5.2-Slice
- Kann parallel zu SLC-523 starten

## Risks

- **Risk:** `unified-timeline.tsx` rendert Meetings derzeit inline (siehe Audit Z.101-111). Refactor koennte andere Type-Renderer beeinflussen, wenn nicht sauber getrennt. 
  Mitigation: Refactor minimal halten — nur Meeting-Type extrahieren, andere Types unveraendert lassen.
- **Risk:** Pre-Bedrock-Meetings haben kein `summary_status`-Feld in der DB. Component muss `undefined` robust behandeln. 
  Mitigation: Optional-Check in der Status-Badge-Logik (`call.summary_status === "completed"` matcht `undefined` nicht).
- **Risk:** Meeting-Datentyp koennte vom Call-Datentyp abweichen (Meeting hat `scheduled_at`, `location`, `agenda`; Call hat `direction`, `phone_number`). 
  Mitigation: Component akzeptiert eigene Meeting-Type-Definition; mappt Felder explizit.

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `cockpit/src/components/meetings/meeting-timeline-item.tsx` (neu) | Komponente analog CallTimelineItem |
| `cockpit/src/components/timeline/unified-timeline.tsx` | Integration: Meeting-Type rendert MeetingTimelineItem |
| (evtl.) Meeting-Type-Datei | falls Meeting-Type noch keinen `ai_summary`-Eintrag hat — additiv ergaenzen |

## QA Focus

- Visueller Test im Browser: Meeting mit Summary zeigt alle Bloecke (Decisions, Action Items, Key Topics als Badges, Transkript)
- Pre-Bedrock-Meeting (manueller Test mit Test-Daten oder altem Meeting) rendert ohne Errors
- CallTimelineItem ist unveraendert
- Andere Timeline-Types (Email, Signal, Activity) sind unveraendert
- Hover, Expand, Collapse funktionieren
- Mobile Viewport: Layout bleibt lesbar
- TypeScript + Lint gruen

## Micro-Tasks

### MT-1: MeetingTimelineItem-Komponente
- Goal: Neue Komponente analog CallTimelineItem mit Meeting-Anpassungen
- Files: `cockpit/src/components/meetings/meeting-timeline-item.tsx`
- Expected behavior: Rendert Meeting mit `ai_summary` (alle Bloecke) ODER ohne (nur Title+Datum). Icon=Calendar, Badge="Meeting".
- Verification: TypeScript kompiliert; Komponente kann mit Mock-Meeting gerendert werden
- Dependencies: none

### MT-2: Backwards-Compatibility-Pruefungen
- Goal: Robust gegen `null`/`undefined`-Werte fuer `ai_summary`, `summary_status`, `transcript`
- Files: `cockpit/src/components/meetings/meeting-timeline-item.tsx` (gleiche Datei wie MT-1)
- Expected behavior: Alle Optional-Chains sind gesetzt; `hasSummary`-Pruefung filtert leere Felder; kein Render-Fehler bei alten Daten
- Verification: Manueller Test mit Mock-Meeting ohne `ai_summary` → nur Title+Datum sichtbar, kein Expand-Button
- Dependencies: MT-1

### MT-3: Integration in unified-timeline.tsx
- Goal: Meeting-Type-Rendering aus inline auf MeetingTimelineItem umstellen
- Files: `cockpit/src/components/timeline/unified-timeline.tsx`
- Expected behavior: Wenn `item.type === "meeting"`, render `<MeetingTimelineItem meeting={...} />`. Mapping von Timeline-Item auf Meeting-Type-Form, falls noetig.
- Verification: Browser-Test: Deal-Timeline mit Meeting-Eintrag zeigt neue Komponente; andere Types (call, email, signal, activity) unveraendert
- Dependencies: MT-1, MT-2

### MT-4: Visuelle Verifikation gegen CallTimelineItem
- Goal: Side-by-Side-Test mit Call und Meeting in derselben Timeline
- Files: keine (manueller Test)
- Expected behavior: Beide Items haben identisches Spacing, Typografie, Hover-Effekt, Expand-Verhalten. Nur Icon, Color, Type-Badge, Title-Logik unterschiedlich.
- Verification: Browser-Screenshot oder visueller Vergleich
- Dependencies: MT-3
