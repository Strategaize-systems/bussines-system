# SLC-409 — Management-Cockpit LLM-Ausbau

## Slice Info
- Feature: FEAT-403
- Priority: Medium
- Delivery Mode: internal-tool

## Goal
Dashboard KI-Cockpit um tiefere LLM-Analysen erweitern: 5+ vordefinierte Abfragen, natuerlichsprachliche Freitext-Abfragen, Trend-Erkennung, Vergleichs-Analysen.

## Scope
- Neue KI-Analyse-Prompts (Pipeline-Health, Multiplikator-Ranking, Forecast, Win/Loss-Trends, Aktivitaets-Analyse)
- Freitext-Abfrage: natuerlichsprachliche Frage → Bedrock → Supabase Query → Antwort
- Ergebnis-UI mit Datenquelle-Transparenz
- /api/ai/query erweitern um management-analysis Type
- Ergebnis-Caching (TTL 1h)

## Out of Scope
- Automatische Alerts bei Trend-Aenderungen
- PDF-Export
- Scheduled Reports

### Micro-Tasks

#### MT-1: Management-Analyse Prompts
- Goal: 5 vordefinierte Analyse-Prompts fuer Bedrock
- Files: `cockpit/src/lib/ai/prompts/management-analysis.ts`
- Expected behavior: Pipeline-Health, Multiplikator-Ranking, Forecast, Win/Loss, Aktivitaet als strukturierte Prompts
- Verification: Bedrock-Calls liefern sinnvolle strukturierte Antworten
- Dependencies: none

#### MT-2: Freitext-Abfrage Engine
- Goal: Natuerlichsprachliche Frage → Bedrock versteht Intent → Supabase Query → Antwort
- Files: `cockpit/src/lib/ai/prompts/management-freetext.ts`, `cockpit/src/app/api/ai/query/route.ts` (erweitert)
- Expected behavior: "Wie viele Deals habe ich diesen Monat gewonnen?" → korrekte Antwort mit Datenquelle
- Verification: Test mit 5+ Beispiel-Fragen
- Dependencies: MT-1

#### MT-3: Dashboard KI-Cockpit UI erweitern
- Goal: Vordefinierte Analyse-Karten + Freitext-Input auf Dashboard
- Files: `cockpit/src/app/(app)/dashboard/ki-analysis.tsx`, `cockpit/src/app/(app)/dashboard/page.tsx` (erweitert)
- Expected behavior: 5 Analyse-Buttons (on-click), Freitext-Input mit Ergebnis-Anzeige, Datenquelle sichtbar
- Verification: Browser-Check, Abfragen liefern Ergebnisse
- Dependencies: MT-1, MT-2

#### MT-4: Ergebnis-Caching
- Goal: Wiederholte Abfragen aus Cache servieren (TTL 1h)
- Files: `cockpit/src/lib/ai/cache.ts`, `cockpit/src/app/api/ai/query/route.ts` (erweitert)
- Expected behavior: Gleiche Abfrage innerhalb 1h wird aus Cache beantwortet
- Verification: Zweite Abfrage ist deutlich schneller, kein Bedrock-Call
- Dependencies: MT-2

## Acceptance Criteria
1. 5 vordefinierte KI-Analyse-Abfragen funktionieren
2. Freitext-Abfrage liefert korrekte Ergebnisse
3. Ergebnisse zeigen Datenquelle
4. Abfragen laufen on-click (Kostenkontrolle)
5. Ergebnis-Caching funktioniert (TTL 1h)
