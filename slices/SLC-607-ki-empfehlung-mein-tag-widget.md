# SLC-607 — KI-Empfehlung + Mein-Tag-Widget

## Slice Info
- Feature: FEAT-603
- Priority: Medium
- Estimated Effort: 1 Tag
- Dependencies: SLC-604 (Prognose-Engine), SLC-606 (Performance-Cockpit UI)

## Goal

KI-gestuetzte Handlungsempfehlung im Performance-Cockpit (on-click) und optionales Ziel-Widget auf "Mein Tag".

## Scope

- Bedrock-Prompt: /lib/ai/prompts/performance-recommendation.ts
- Server Action: getPerformanceRecommendation(goalProgress[])
- UI: "KI-Empfehlung abrufen" Button im Performance-Cockpit
- Mein-Tag-Widget: Kompakte Ziel-Zusammenfassung als Card

## Out of Scope

- Automatische KI-Empfehlung (bleibt on-click, DEC-028)
- Coaching-Modus
- Team-Vergleich

## Acceptance Criteria

1. "KI-Empfehlung abrufen" Button im Performance-Cockpit
2. On-click: Bedrock-Call, Ergebnis wird in-page angezeigt
3. Empfehlung ist konkret und actionable (nicht generisch)
4. Loading-State waehrend Bedrock-Call
5. Mein-Tag-Widget zeigt kompakte Ziel-Zusammenfassung (max 3 Ziele)
6. Widget verlinkt auf /performance fuer Details
7. `npm run build` gruen

## QA-Fokus

- KI-Empfehlung: Inhalt ist konkret und bezieht sich auf echte Zahlen
- Edge Case: Keine Ziele → Button nicht sichtbar
- Edge Case: Bedrock-Fehler → Fehler-Message statt Crash
- Mein-Tag: Widget zeigt korrekte Werte, Link funktioniert

### Micro-Tasks

#### MT-1: Bedrock-Prompt + Server Action
- Goal: Prompt-Template und Server Action fuer KI-Empfehlung
- Files: `lib/ai/prompts/performance-recommendation.ts`, `app/actions/goals.ts` (erweitern)
- Expected behavior: getPerformanceRecommendation nimmt GoalProgress-Array, baut Prompt mit konkreten Zahlen, ruft Bedrock auf, liefert String-Empfehlung zurueck. Kosten ~$0.01/Call.
- Verification: `npm run build` gruen
- Dependencies: none

#### MT-2: KI-Empfehlung UI im Performance-Cockpit
- Goal: Button + Ergebnis-Anzeige in /performance
- Files: `components/performance/ai-recommendation.tsx`, `app/(app)/performance/page.tsx` (erweitern)
- Expected behavior: Button "KI-Empfehlung abrufen". On-click: Loading-Spinner, dann Empfehlung als Card-Text. Fehler-Handling bei Bedrock-Timeout.
- Verification: Browser-Test: Button klicken, Empfehlung erscheint
- Dependencies: MT-1

#### MT-3: Mein-Tag Ziel-Widget
- Goal: Kompakte Ziel-Uebersicht als Card auf "Mein Tag"
- Files: `components/mein-tag/goals-widget.tsx`, Mein-Tag-Page (bestehend, erweitern)
- Expected behavior: Card "Ziele diesen Monat" mit max 3 Zielen (Umsatz ████░░░ 64%, Deals ████████ 120%, Quote ██░░░░ 73%). Link "→ Meine Performance". Nur sichtbar wenn aktive Ziele existieren.
- Verification: Browser-Test: Widget sichtbar auf Mein Tag, Link funktioniert
- Dependencies: MT-2
